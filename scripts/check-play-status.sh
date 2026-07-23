#!/usr/bin/env bash
# Is the new Play listing live yet?  bash scripts/check-play-status.sh
# Ground truth = the public store URL. 200 = live, 404 = still in review.
NEW=com.mubasher.smartsignals
OLD=com.rumble.pro
for id in "$NEW" "$OLD"; do
  code=$(curl -s -o /dev/null -w "%{http_code}" -L "https://play.google.com/store/apps/details?id=$id&hl=en&gl=US")
  if [ "$code" = "200" ]; then state="✅ LIVE"; else state="⏳ not public (in review / unpublished)"; fi
  printf "%-28s HTTP %-4s %s\n" "$id" "$code" "$state"
done
echo
echo "When $NEW turns LIVE:"
echo "  1. web/app/(landing)/page.tsx -> PLAY_STORE_URL -> ?id=$NEW  (+ drop the stale ⚠️ comment), redeploy"
echo "  2. Only THEN retire $OLD (farewell build -> 60-90 days -> unpublish). Never before."
