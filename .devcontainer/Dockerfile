FROM ghcr.io/bare-devcontainer/pnpm:12-trixie

ARG WORKSPACE_FOLDER

USER root
RUN install -d -o dev -g dev \
      "$WORKSPACE_FOLDER/node_modules" \
      "$WORKSPACE_FOLDER/client/node_modules" \
      "$WORKSPACE_FOLDER/server/node_modules"
USER dev
