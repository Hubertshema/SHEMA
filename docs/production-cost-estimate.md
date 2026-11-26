# CallVault Production Cost Estimate & Resource Planning

## 1. Cost Breakdown by Component (Monthly Estimates)

### A. Neon PostgreSQL Database
- **Tier**: Neon Launch / Scale Tier
- **Compute**: Autoscaling (0.25 - 2 vCPU)
- **Storage**: ~10 GB - 50 GB database storage
- **Estimated Cost**: $19 - $49 / month (Free tier available for development/low traffic).

### B. Node.js Backend API Hosting (Render / Railway / Fly.io)
- **Tier**: Standard Production Instance (2 vCPU, 4 GB RAM)
- **Estimated Cost**: $15 - $35 / month per container instance.

### C. Object Storage (AWS S3 / R2)
- **Storage**: 100 GB - 500 GB audio recordings (~5 MB per recording * 20,000 recordings)
- **Egress & Requests**: Standard S3 PUT/GET request pricing + data transfer out.
- **Estimated Cost**: $10 - $25 / month.

### D. Bandwidth & CDN
- **Data Transfer**: ~100 GB outbound bandwidth.
- **Estimated Cost**: $5 - $15 / month.

---

## 2. Total Estimated Monthly Operating Cost
- **Starter / Low Volume (< 1,000 active users)**: $0 - $25 / month (leveraging free tiers).
- **Growth / Medium Volume (1,000 - 10,000 active users)**: $50 - $125 / month.
- **Scale / High Volume (10,000+ active users)**: $200+ / month (scaling database compute and S3 storage).
