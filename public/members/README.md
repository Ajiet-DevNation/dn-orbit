# Member photos

Self-hosted headshots for the Members section (`constants/members.ts` →
`imageUrl: "/members/<slug>.jpg"`). Sourced from the **DevNation Core Member
Directory Profile** form uploads, downscaled to 720px (long edge) / quality 82.

To change someone's photo, save it under a **new filename** (e.g. `<slug>-2.jpg`)
and update `imageUrl`. `next/image` caches each photo by URL for 30 days
(`minimumCacheTTL` in `next.config.ts`), so overwriting a file in place keeps
serving the old picture.

| Member | File |
|--------|------|
| Aboobakkar Twaha | `twaha.jpg` |
| Muaz Ismail Mohammed | `muaz.jpg` |
| Anirudh Rao B | `anirudh-rao-2.jpg` |
| Arjun R | `arjun-r.jpg` |
| U K Ahmed Shafeel | `ahmed-shafeel.jpg` |
| Iffah Zohara | `iffah-zohara.jpg` |
| Khushi K Kantaria | `khushi-kantaria.jpg` |
| Jiya Hussain | `jiya-hussain.jpg` |
| Jizel Prince D'Souza | `jizel-dsouza.jpg` |
| Sunpreeth Vishva | `sunpreeth-vishva.jpg` |
| Mohamed Dhul Kifl | `dhul-kifl.jpg` |
| Pahima R Uchil | `pahima-uchil.jpg` |
| Mohammed Aimaan Afzal | `aimaan-afzal.jpg` |
| Purvi Vinayagam | `purvi-vinayagam.jpg` |

To add/replace a photo, drop the original in `member_photos/` and run (the
`convert` step also handles HEIC → JPEG):

```bash
convert "<original>" -auto-orient -resize '720x720>' -quality 82 <slug>.jpg
```
