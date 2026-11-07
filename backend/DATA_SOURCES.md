# Data Sources & Licensing

## 1. CLAIM Task
- **Positives**: ClaimBuster (Zenodo DOI: 10.5281/zenodo.3609356) check-worthy factual sentences; plus `regulator_claims.csv` sourced from public regulatory adjudications (ASCI / RBI / SEBI / ASA).
- **Negatives**: ClaimBuster non-factual/unimportant sentences; real ad copy samples from Hugging Face datasets (`smangrul/ad-copy-generation`, `PeterBrendan/Ads_Creative_Text_Programmatic`).
- **Licences**: Open Access / Research Open.
- **Limitations**: ClaimBuster consists largely of political debate speech, whereas our app analyzes financial marketing copy. Domain shift is expected and handled via hybrid threshold tuning.

## 2. TONE Task
- **Corpus**: Stanford Politeness Corpus via ConvoKit (`wikipedia-politeness-corpus`, `stack-exchange-politeness-corpus`).
- **Licence**: CC BY 4.0.
- **Preprocessing**: Impolite = positive (tone problem), polite = negative. Neutral middle samples are dropped to maintain clean decision boundaries.
- **Limitations**: Sourced from Wikipedia talk pages and Stack Exchange requests rather than promotional ad copy.
