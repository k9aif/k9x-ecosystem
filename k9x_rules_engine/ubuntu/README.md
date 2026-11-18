# K9X rules engine on Ubuntu

The GoRules agent in one podman container. It serves decision models (GoRules JDM files) from a folder on this
host, read-only. K9-AIF applications call it through a rules adapter (`BaseRulesAdapter`); the rules themselves
live here, not in application code.

```bash
./ubuntu/build-run.sh all      # pull the image and start it
./ubuntu/build-run.sh status   # is it running?
./ubuntu/build-run.sh logs     # follow the logs
./ubuntu/build-run.sh stop
```

| Setting | Default | Notes |
|---|---|---|
| `HOST_PORT` | `8130` | Port on this host. Not 8080: PlantUML uses it. |
| `RULES_DIR` | `~/containers/volumes/rules` | Decision models; mounted read-only. Edit a rule, then `start` again. |

Internal service with no login: keep it on the LAN, never behind a public tunnel.

First rule (accounts payable demo on openai.k9x.ai): an invoice over $15,000 needs a person's approval in
K9X HIL; otherwise it is paid automatically.
