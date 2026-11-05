# Performance report

Nothing was measured live. Sizes are raw, from an existing dist that predates HEAD: entry 399 KB, supabase 227, react 165, CSS 77, Landing 211; lazy pdf.worker 1264, three 830, pdf 484, charts 466, mammoth chunk 308. Entry has no three or GSAP. Findings: PERF-01, PERF-02, DEF-13, REL-06. Only benchmark: docs/evaluation/results.json, 0.176 ms per student, dated 6 Oct, no network or DB. Thresholds not set; propose them for approval.
