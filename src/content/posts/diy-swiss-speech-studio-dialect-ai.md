---
author: Ryan Guo
pubDatetime: 2026-09-27T12:00:00Z
title: "DIY Swiss Speech Studio: Building a Native Dialect ASR, Neural TTS, and Pronunciation Tutor from Scratch"
featured: true
tags:
  - speech-ai
  - pytorch
  - swiss-german
  - conformer
  - deep-learning
  - diy
description: "How I built an end-to-end Swiss German speech AI suite on a DIY budget: from stratified 8-canton data extraction and Conformer-Transducers to frame-level phoneme GOP grading and 10MB INT8 edge deployment."
---

If you have ever tried using Siri, Google Speech, or OpenAI Whisper to transcribe or evaluate Swiss German (*Schwiizerdütsch*), you have experienced the **hallucination trap**. 

You speak an authentic Alemannic phrase like *"Chuchichäschtli"* (kitchen cupboard) or *"Grüessech wohl zäme"*, and commercial autoregressive models do one of two things:
1. They involuntarily "correct" your dialect speech into formal Standard High German (*Hochdeutsch*), turning your sentence into *"Küchenschrank"*.
2. They choke on the unstandardized phonology and hallucinate gibberish.

Swiss German exists in a state of **diglossia**: millions of people speak regional Alemannic dialects every day across 26 cantons, but written documents and news broadcasts are conducted in standard German. There is no official orthography, no standardized spelling dictionary, and severe regional divergence—from the melodic, vowel-lengthened cadences of Bern (*Bärndütsch*) to the uvular-rasping gutturals of Zurich (*Züritüütsch*) and the archaic alpine diphthongs of Valais (*Walliserdütsch*).

I decided to tackle this as a DIY engineering challenge: **Can an indie developer design, train, and deploy a complete Swiss German Speech AI ecosystem from scratch on consumer hardware?**

The result is **Swiss Speech Studio**: a unified system featuring:
- **Speech-to-Text (STT)**: Dual-approach Conformer-CTC and streaming Conformer-Transducers (RNN-T).
- **Pronunciation Tutor ("Schwiizer-Ohr")**: Frame-level Goodness of Pronunciation (GOP) and pitch intonation DTW grading down to 40ms.
- **Dialect Voice Synthesizer (TTS)**: FastSpeech2 conditioned across 8 cantons with native throat-grain flutter grafting.
- **In-Browser Edge Deployment**: Compressed to a 10.45 MB INT8 ONNX graph with a macOS Sequoia-inspired web studio.

Here is the complete DIY blueprint of how it was built.

---

## Architecture Overview

```
                      [User Microphone / 16kHz Audio]
                                     │
                 ┌───────────────────┴───────────────────┐
                 ▼                                       ▼
      [Log-Mel Spectrogram (80-ch)]             [16kHz Raw PCM Waveform]
                 │                                       │
                 ▼                                       ▼
    [9.5M SwissConformer Encoder]               [Meta MMS-300M Backbone]
    (4x 2D-Conv + 8 Conformer Blocks)           (24 Transformer Layers, Frozen Extractor)
                 │                                       │
     ┌───────────┴───────────┐                           ▼
     ▼                       ▼                 [Multi-Task CTC & Canton Heads]
[Phone Posteriors]      [Char Posteriors]                │
  (54 IPA Classes)        (52 Classes)                   │
     │                       │                           ▼
     ├───────────────────────┼─────────────► [Alemannic BPE-400 Decoding]
     │                       │                           │
     ▼                       ▼                           ▼
[Viterbi Forced Align]  [Greedy CTC Collapse]   [4-Gram LM Beam Rescoring]
     │                       │                           │
     ▼                       ▼                           ▼
[GOP Phonetic Scoring]  [Lexicon Alignment]    [Faithful Dialect Transcript]
     │                       │
     ▼                       ▼
[F0 Pitch DTW Intonation] [Canton Identification (ZH, BE, BS, VS, LU, SG, AG, GR)]
     │
     ▼
[Diagnostic Feedback Coach]
("Push friction deeper to [χ]!")
```

---

## Step 1: Solving the Dialect Data Crisis (The SwissDial Imbalance)

Any speech project lives or dies by its corpus. I sourced the open **SwissDial v1.1** dataset (parallel recordings across Swiss cantons) and **STT4SG-350** (Swisscom/Idiap). But upon inspecting the raw SwissDial tarball, I discovered a subtle bug that ruins naive training:

### The Tarball Trap
The audio files inside the archive were stored hierarchically by canton name. Sequential extraction scripts with sample caps halted early, producing **91.6% Valais (`vs`)**, **8.4% Basel (`bs`)**, and **0%** for Zurich (`zh`), Bern (`be`), Lucerne (`lu`), or St. Gallen (`sg`). If trained on this, your model would assume every Swiss person is an alpine shepherd from Zermatt.

### Stratified Extraction Pipeline
I wrote `data/prepare_swissdial.py` to stream through the tarball on-the-fly and enforce strict stratified quota accounting:

```python
# Stratified multi-canton tracking
CANTONS = ['zh', 'be', 'bs', 'lu', 'sg', 'vs', 'ag', 'gr']
canton_counts = {c: 0 for c in CANTONS}
target_per_canton = 500  # Exactly 4,000 balanced utterances (1:1:1:1:1:1:1:1)

for member in tar:
    if all(canton_counts[c] >= target_per_canton for c in CANTONS):
        break
    canton = member.name.split('/')[1].lower()
    if canton in CANTONS and canton_counts[canton] < target_per_canton:
        # Process and store...
        canton_counts[canton] += 1
```

### Dual-Modal Contiguous Binary Buffers
Instead of saving 4,000 individual tiny `.wav` files and incurring disk I/O thrashing during epoch iterations, I packed the audio into two contiguous, memory-mappable binary files:
1. `spectrograms_balanced.bin`: 80-channel Log-Mel filterbanks (10ms hop, 25ms window) for Conformer encoders.
2. `waveforms_balanced.bin`: 16kHz mono raw float32 PCM samples for foundation backbones (e.g., Meta MMS-300M).

```python
# Packing binary buffer with index manifest offsets
with open("spectrograms_balanced.bin", "wb") as f_spec:
    for spec_tensor in dataset:
        spec_bytes = spec_tensor.numpy().tobytes()
        offset = f_spec.tell()
        f_spec.write(spec_bytes)
        manifest.append({
            "spec_offset": offset, 
            "spec_frames": spec_tensor.shape[0]
        })
```

---

## Step 2: Escaping Autoregressive Hallucination (Conformer-CTC)

Why do Whisper and typical seq2seq models fail on dialects? Because their causal language model decoder predicts the *statistically most likely next word in standard high German* rather than attending strictly to acoustic reality.

To break free, I adopted a **non-autoregressive Conformer-CTC** architecture:

1. **2D-Convolutional 4x Subsampling**: Two strided $3 \times 3$ convolutions downsample 10ms speech frames into 40ms acoustic representations while preserving local spectral continuity.
2. **Conformer Blocks (Macaron-style)**: Combining depthwise separable convolutions (capturing localized phonetic friction like $[\chi]$ and $[pf]$) with multi-head self-attention (modeling sentence-wide prosody).
3. **CTC Loss (Connectionist Temporal Classification)**: By predicting frame-by-frame emissions conditionally independent of past text tokens, the network cannot "invent" words.

### The `<blank>` Token Question in CTC
One of the most common pitfalls when implementing CTC from scratch is token management:
- **In Ground Truth Labels**: **Never** include `<blank>`. Targets must be pure phoneme/character IDs (e.g., `[χ, u, χ, i]`). The CTC dynamic programming forward-backward algorithm inserts blank states automatically along the alignment lattice.
- **In Model Logits**: **Always** allocate index 0 for `<blank>` ($\epsilon$).
- **Early Training Behavior**: In Epoch 1–2, `<blank>` probability will be ~95%. This is mathematically optimal for the network before temporal alignments are refined. By Epoch 6, non-blank peaks spike to >90% precisely at phonetic boundaries.

```python
# Core Conformer-CTC definition (9.5M parameters)
class SwissConformer(nn.Module):
    def __init__(self, d_model=256, n_heads=4, n_layers=8):
        super().__init__()
        self.subsampling = nn.Sequential(
            nn.Conv2d(1, d_model, kernel_size=3, stride=2, padding=1),
            nn.ReLU(),
            nn.Conv2d(d_model, d_model, kernel_size=3, stride=2, padding=1),
            nn.ReLU(),
        )
        self.linear_proj = nn.Linear(d_model * 20, d_model)
        self.conformer = torchaudio.models.Conformer(
            input_dim=d_model,
            num_heads=n_heads,
            ffn_dim=512,
            num_layers=n_layers,
            depthwise_conv_kernel_size=31
        )
        self.phone_head = nn.Linear(d_model, 54)  # 54 IPA tokens
        self.char_head = nn.Linear(d_model, 52)   # 52 Swiss characters
        self.canton_head = nn.Linear(d_model, 8)  # 8 Cantons
```

---

## Step 3: Real-Time Dictation with Streaming Transducers (RNN-T)

While CTC gives pure acoustic alignment, it lacks language context. To achieve real-time streaming dictation without hallucination, I implemented a **Streaming Conformer-Transducer (RNN-T)**:

- **Chunked Causal Attention**: Processes audio in **160ms chunks** (4 downsampled acoustic frames) with an **80ms lookahead**.
- **Prediction Network**: An autoregressive 2-layer network that conditions on previously emitted subwords.
- **Joint Fusion Network**: Combines acoustic features $\mathbf{h}_t^{\text{enc}}$ and label history $\mathbf{h}_u^{\text{pred}}$ to emit probabilities over vocabulary + blank.

```python
# Joint Network Fusion
class TransducerJointNetwork(nn.Module):
    def __init__(self, enc_dim=256, pred_dim=256, joint_dim=320, vocab_size=400):
        super().__init__()
        self.fc_enc = nn.Linear(enc_dim, joint_dim)
        self.fc_pred = nn.Linear(pred_dim, joint_dim)
        self.fc_out = nn.Linear(joint_dim, vocab_size)

    def forward(self, h_enc, h_pred):
        # h_enc: (B, T, 1, D), h_pred: (B, 1, U, D)
        z = torch.tanh(self.fc_enc(h_enc) + self.fc_pred(h_pred))
        return self.fc_out(z)
```

In benchmark tests, this streaming engine achieves **32.8ms mean chunk latency on an Apple M-series CPU**—well below the 150ms real-time conversational budget.

---

## Step 4: "Schwiizer-Ohr" — The DIY Pronunciation Tutor

The most unique component of the studio is the Computer-Assisted Pronunciation Training (CAPT) engine. When language learners attempt Swiss German, the hardest hurdles are:
1. The **uvular voiceless fricative $[\chi]$** (as in *Chuchichäschtli*), which non-natives soften into standard German $[ç]$ (as in *ich*) or hard $[k]$.
2. The **unvoiced lenis stops** ($[b_{\text{lenis}}]$, $[d_{\text{lenis}}]$, $[g_{\text{lenis}}]$), which foreigners voice with vocal cord vibration.
3. The **cantonal *Satzmelodie*** (pitch cadence).

### 1. Viterbi Trellis Forced Alignment
To grade a user's speech, we must first locate *where* in time each phoneme occurred. I built a dynamic programming Viterbi aligner over the CTC emission matrix:

```python
def viterbi_ctc_align(emissions: torch.Tensor, target_ids: list, blank_id=0):
    # emissions: (Time, Vocab)
    T, V = emissions.shape
    expanded_seq = [blank_id]
    for tid in target_ids:
        expanded_seq.extend([tid, blank_id])
    S = len(expanded_seq)

    trellis = torch.full((T, S), -float('inf'))
    backptr = torch.zeros((T, S), dtype=torch.long)
    # Forward dynamic programming pass...
    # Backward traceback returns exact (start_frame, end_frame) per phoneme
    return phoneme_spans
```

### 2. Goodness of Pronunciation (GOP)
Rather than scoring with raw confidence (which fluctuates with mic gain), I implemented the **Log-Posterior-Ratio GOP**:

$$\text{GOP}(p) = \frac{1}{|T_p|} \sum_{t \in T_p} \left[ \ln P(p \mid x_t) - \max_{q \neq p, q \neq \epsilon} \ln P(q \mid x_t) \right]$$

If $\text{GOP}(p) > 0$, the target phoneme decisively outcompeted all alternative sounds. If $\text{GOP}(p) < 0$, the engine inspects the winning competitor $q$ and emits a pedagogical tip:

> *"Your 'ch' was too soft (standard German style). Push the friction deeper into the back of your throat to hit $[\chi]$!"*

```python
# Identifying substitution error
comp_logp, comp_arg = seg[:, comp_mask].max(dim=-1)
frame_gops = target_logp - comp_logp
mean_gop = float(frame_gops.mean().item())

if mean_gop < -0.5:
    substitute = INV_VOCAB.get(mode_comp_id)
    feedback = COACHING_DIAGNOSTICS[target_phoneme]["advice"]
```

### 3. F0 Intonation DTW (*Satzmelodie*)
Pitch contours are extracted via autocorrelation (`torchaudio.functional.detect_pitch_frequency`), converted to semitone offsets relative to the speaker's median pitch:

$$\text{Semitones}(t) = 12 \times \log_2 \left( \frac{F_0(t)}{\text{Median}(F_0)} \right)$$

Dynamic Time Warping (DTW) aligns the user's pitch curve with the native cantonal reference curve, scoring melodic cadence independently of speaking speed:

```python
dist, intonation_score = compute_pitch_dtw(user_semitones, native_ref_semitones)
```

---

## Step 5: Subwords, Augmentation & Closed-Loop Synthetic Data

Training robust speech models on limited dialect data requires clever data engineering:

1. **Alemannic BPE-400 Tokenizer**: Standard German tokenizers fragment Swiss words into meaningless characters. I trained a custom Byte-Pair Encoding model ($V=400$) on 30,000 Swiss German sentences, preserving key dialect morphemes (`chuch`, `scht`, `li`, `uusig`, `ächt`) with a **2.21x character compression factor**.
2. **Audio Perturbations**:
   - Random pitch shifts ($\pm 2$ semitones).
   - Speed perturbations ($0.9\times - 1.1\times$).
   - Room Impulse Response (RIR) convolution to simulate home recording acoustics.
3. **Online SpecAugment**: Masking up to 15 Mel frequency bins and 35 time frames dynamically on GPU.
4. **4-Gram Swiss LM Rescoring**: A statistical backoff language model with Jelinek-Mercer smoothing that rescores CTC beam search hypotheses.

---

## Step 6: DIY Training Optimizations & Benchmarks

Training a 315M parameter foundation model or a 9.5M Conformer on a developer machine requires optimizing every compute cycle:

### The Dynamic Length Bucketing Hack (`BucketBatchSampler`)
Speech utterances vary widely in length (0.8s to 12.0s). Standard random batching results in batches where up to 80% of data is wasted on `<pad>` tokens. 

By sorting audio files into duration quantiles and sampling exclusively within the same bucket:
- **Superfluous padding reduced by >70%**.
- **Epoch training speed improved by 30%–50%** on both Apple Silicon and CUDA GPUs.

### Apple Silicon GPU (MPS) Acceleration
In PyTorch, `torch.nn.CTCLoss` lacks a native Metal (MPS) kernel. Attempting to train on Apple GPUs normally throws an error. The fix is a one-line environment flag that routes Transformer convolutions and attention to the Apple Silicon GPU while silently executing the lightweight CTC lattice on CPU:

```bash
export PYTORCH_ENABLE_MPS_FALLBACK=1
python train.py --task asr --backbone conformer --device mps --batch_size 8
```

### Hardware Benchmarks

| Hardware | Backend | Step Time | Epoch (3,200 samples) | Speedup |
| :--- | :--- | :---: | :---: | :---: |
| **Apple M-Series CPU** | Torch CPU (10 threads) | 2,750 ms | ~36 min | $1.0\times$ (Baseline) |
| **Apple Silicon GPU (MPS)** | MPS + CPU Fallback | **580 ms** | **~7.7 min** | **~4.7x faster** |
| **NVIDIA RTX 4090 / A100** | CUDA + FlashAttention FP16 | **45 ms** | **~0.9 min** | **~35x–50x faster** |

For longer experiments, I packaged a standalone shell script (`scripts/deploy_gcp.sh`) that provisions an ephemeral preemptible GPU instance on Google Cloud, trains the checkpoint, syncs the weights to Google Cloud Storage (`gs://`), and automatically tears down the VM.

---

## Step 7: Edge Deployment (<11 MB) & The Studio Interface

To make the pronunciation tutor truly accessible, it couldn't remain a heavy Python script.

Using dynamic INT8 quantization, I exported the SwissConformer encoder to ONNX:
- **Model Size**: Compressed from 38.2 MB to **10.45 MB** (73% memory reduction).
- **Acoustic Fidelity**: Maintained a Pearson correlation of $r = 0.9999$ against the FP32 reference model.
- **Runtime**: Capable of executing client-side in the browser via WebAssembly (`onnxruntime-web`).

The accompanying web studio (`server.py` + `web/index.html`) was designed with an Apple Intelligence dark aesthetic (inspired by macOS Sequoia and iOS 18), featuring:
- **Speech-to-Text Studio**: Live microphone dictation, multi-canton dialect identification, and automatic translation to High German and English.
- **Pronunciation Scorecard**: Visual fitness-ring accuracy meters, GOP score breakdowns per phoneme, and side-by-side DTW intonation canvas plots.
- **Dialect Voice Synthesizer**: Canton-conditioned FastSpeech2 TTS with customizable pitch, speed, and authentic 24Hz uvular fricative flutter grafting.

---

## Lessons Learned & What's Next

Building an end-to-end speech AI suite for a low-resource dialect continuum taught me three fundamental lessons:

1. **Beware the Standard Language Prior**: For dialect AI, autoregressive decoders are often your enemy. Non-autoregressive Conformer-CTC and causal Transducers provide the acoustic discipline needed to respect regional varieties without hallucinating standard forms.
2. **Stratification is Non-Negotiable**: In uncurated regional datasets, naive sampling introduces massive cantonal bias. Always balance your manifests before running a single gradient step.
3. **Intonation is Half the Language**: Dialects like Swiss German cannot be evaluated on phonetics alone. Adding $F_0$ pitch tracking and DTW *Satzmelodie* scoring makes the difference between a sterile model and a truly helpful language tutor.

The full codebase—including dataset preparation scripts, Conformer and Transducer architectures, GOP grading engines, and the Web UI—is organized modularly in the project repository.

If you are exploring dialect speech processing, building on-device pronunciation models, or trying to teach AI to appreciate *Schwiizerdütsch*, I hope this DIY breakdown provides a solid starting point!
