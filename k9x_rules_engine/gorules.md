# GoRules agent

Run it with `ubuntu/build-run.sh all` (see `ubuntu/README.md`). The equivalent podman command:

```bash
sudo podman run -d \
  --name gorules-agent \
  -p 8130:8080 \
  -e PROVIDER__TYPE=Filesystem \
  -e PROVIDER__ROOT_DIR=/data \
  -v /home/ravinata/containers/volumes/rules:/data:ro \
  --restart=unless-stopped \
  gorules/agent:latest
```

Host port 8130, not 8080: PlantUML uses 8080 on this host.
