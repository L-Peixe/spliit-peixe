#!/usr/bin/env bash
# Ramificação `preview` do Neon (ADR-008). Só toca nela; a `main` (produção) é apenas a origem.
# Uso: scripts/neon-preview.sh status | reset
# A chave da API entra pelo proxy da nuvem (credencial do host console.neon.tech).
set -euo pipefail
API=https://console.neon.tech/api/v2/projects/winter-truth-38045534
PREVIEW=br-twilight-shadow-b6o8vrai
MAIN=br-wandering-snow-b6w40eui

case "${1:-status}" in
  status)
    curl -sSf "$API/branches/$PREVIEW" | python3 -c "import json,sys;b=json.load(sys.stdin)['branch'];print(b['name'],b['current_state'],'atualizada',b.get('last_reset_at') or b['created_at'])" ;;
  reset)
    # Volta a preview ao estado atual da produção (dados e schema). A preview perde o que tinha.
    curl -sSf -X POST "$API/branches/$PREVIEW/reset_to_parent" -H 'Content-Type: application/json' -d '{}' >/dev/null
    echo "preview resetada a partir da main ($MAIN)" ;;
  *) echo "uso: $0 status|reset" >&2; exit 1 ;;
esac
