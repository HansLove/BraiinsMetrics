# Braiins Hashpower — spot pricing snapshot

Live values from the Braiins Hashpower **spot** JSON API (same sources as `braiins-metrics.js`).

| | |
| --- | --- |
| **Generated (UTC)** | 2026-05-04T11:21:42.869Z |
| **API base** | `https://hashpower.braiins.com/v1` |
| **Market status** | SPOT_INSTRUMENT_STATUS_ACTIVE |
| **Price unit (sats)** | Listed as **sats per EH/day** in the order book |

## Top of book (aggregated)

| Metric | Value |
| --- | ---: |
| Best bid (sats) | 61,327,000 |
| Best bid (BTC) | 0.61327000 |
| Best ask (sats) | 47,125,000 |
| Best ask (BTC) | 0.47125000 |
| Mid (sats) | 54,226,000 |
| Spread (sats) | -14,202,000 |
| Visible bid / ask levels | 144 / 8 |

_Spread = best ask (sats) − best bid (sats). A negative value means the top-of-book bid is above the top-of-book ask (possible with aggregated ladders)._

## Recent trades (sample)

| Time (UTC) | Price (sats) | Volume (_m_ field) |
| --- | ---: | ---: |
| 2026-05-04T11:20:55Z | 49,443,697.04579 | 7,464.487014 |
| 2026-05-04T11:20:40Z | 49,428,169.052393 | 6,847.796178 |
| 2026-05-04T11:20:25Z | 49,435,861.328295 | 6,965.641018 |
| 2026-05-04T11:20:10Z | 49,447,221.233998 | 8,039.597038 |
| 2026-05-04T11:19:55Z | 49,449,249.858444 | 7,823.955057 |
| 2026-05-04T11:19:40Z | 49,433,205.702941 | 6,845.944479 |
| 2026-05-04T11:19:25Z | 49,424,624.545704 | 7,314.29848 |
| 2026-05-04T11:19:10Z | 49,390,440.774396 | 6,654.504471 |
| 2026-05-04T11:18:55Z | 49,441,179.14155 | 7,111.921999 |
| 2026-05-04T11:18:40Z | 49,425,824.498257 | 7,155.618963 |
| 2026-05-04T11:18:25Z | 49,404,498.40642 | 6,043.786676 |
| 2026-05-04T11:18:10Z | 49,402,476.115428 | 6,615.766158 |
| 2026-05-04T11:17:55Z | 49,429,602.391212 | 7,179.646975 |
| 2026-05-04T11:17:40Z | 49,425,383.797677 | 6,967.245368 |
| 2026-05-04T11:17:25Z | 49,419,940.415553 | 6,755.818724 |
| 2026-05-04T11:17:10Z | 49,436,710.885119 | 7,413.100428 |
| 2026-05-04T11:16:55Z | 49,427,174.341889 | 6,704.173689 |
| 2026-05-04T11:16:40Z | 49,403,964.74466 | 6,296.36066 |
| 2026-05-04T11:16:25Z | 49,444,997.480747 | 7,594.006423 |
| 2026-05-04T11:16:10Z | 49,417,953.344409 | 6,832.767015 |
| 2026-05-04T11:15:55Z | 49,436,066.599294 | 7,712.908778 |
| 2026-05-04T11:15:40Z | 49,423,861.335676 | 7,110.790369 |
| 2026-05-04T11:15:25Z | 49,442,439.455685 | 7,883.182551 |
| 2026-05-04T11:15:10Z | 49,418,740.153912 | 6,399.840112 |
| 2026-05-04T11:14:55Z | 49,432,554.960465 | 6,685.16917 |

_Trade sample size in this file: up to 25 rows. Run `node braiins-metrics.js` to refresh._

## Order book — bids (top 15)

| Price (sats) | Price (BTC) | Hashrate (PH, matched/avail) | amount_sat |
| --- | --- | --- | ---: |
| 61,327,000 | 0.61327000 | 2.046783 | 5,858 |
| 61,326,000 | 0.61326000 | 1.211032 | 61,898 |
| 61,325,000 | 0.61325000 | 1.057539 | 27,901 |
| 61,323,000 | 0.61323000 | 1.610241 | 5,740 |
| 61,314,000 | 0.61314000 | 1.046025 | 351,014 |
| 61,200,000 | 0.61200000 | 1.046025 | 236,693 |
| 61,000,000 | 0.61000000 | 1.046025 | 161,761 |
| 52,695,000 | 0.52695000 | 1.046025 | 16,263 |
| 52,287,000 | 0.52287000 | 1.046025 | 282,664 |
| 52,001,000 | 0.52001000 | 1.046025 | 4,139 |
| 51,000,000 | 0.51000000 | 28.24268 | 4,140,657 |
| 50,889,000 | 0.50889000 | 1.046025 | 7,095 |
| 50,500,000 | 0.50500000 | 3.138074 | 99,884 |
| 50,422,000 | 0.50422000 | 9.414227 | 39,203 |
| 50,363,000 | 0.50363000 | 1.046025 | 18,104 |

## Order book — asks (top 15)

| Price (sats) | Price (BTC) | Hashrate (PH) |
| --- | --- | --- |
| 47,125,000 | 0.47125000 | 113.982741 |
| 47,363,000 | 0.47363000 | 179.152788 |
| 47,601,000 | 0.47601000 | 325.920516 |
| 47,839,000 | 0.47839000 | 398.817982 |
| 48,077,000 | 0.48077000 | 478.085889 |
| 48,553,000 | 0.48553000 | 616.977214 |
| 49,029,000 | 0.49029000 | 432.866199 |
| 49,981,000 | 0.49981000 | 507.960481 |

## Spot fee config

```json
{
  "spot_fees": [
    {
      "symbol": "SHA256_BTC",
      "fee": {
        "fee_rate_pct": 0
      },
      "fee_type": "SPOT_FEE_TYPE_BUY"
    }
  ]
}
```

## Market settings (raw)

```json
{
  "created": "2025-04-16T14:56:38.156Z",
  "min_limited_bid_duration_s": 1800,
  "status": "SPOT_INSTRUMENT_STATUS_ACTIVE",
  "max_bids_per_subaccount": 10,
  "max_bid_price_sat": 500000000,
  "bid_grace_period_s": 900,
  "max_ask_price_sat": 0,
  "min_bid_price_decrease_period_s": 600,
  "max_bid_amount_sat": 100000000,
  "hr_unit": "EH/day",
  "max_bid_speed_limit_ph": 0,
  "max_limited_bid_amount_sat": 100000000,
  "tick_size_sat": 1000,
  "min_bid_price_sat": 0,
  "max_asks_per_subaccount": 10,
  "min_ask_price_sat": 1000000,
  "ask_grace_period_s": 60,
  "min_bid_amount_sat": 10000000,
  "min_bid_speed_limit_decrease_period_s": 600,
  "min_bid_speed_limit_ph": 1,
  "min_limited_bid_amount_sat": 10000,
  "max_bid_idle_time_s": 86400,
  "hr_multiplier_log10": 18
}
```

## USD reference benchmarks (manual)

These USD figures are **not** from the API; they mirror the static benchmark in `braiins-metrics.js` (Braiins UI / luck reference).

| | |
| --- | ---: |
| USD / PH / day | 38 |
| USD / PH / hour | 1.583333 |
| USD / 100TH / day | 3.8 |
| USD / 100TH / hour | 0.158333 |
| USD / 10TH / hour | 0.015833 |

---

_Aggregated trade stats in `braiins-report.json`: count 100, avg 49,421,329.0299 sats._
