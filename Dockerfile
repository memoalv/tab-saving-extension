# Stage 1: Runtime =============================================================
# The minimal package dependencies required to run the app in the release image:

# Use the official Node LTS Slim Buster image as base:
FROM node:lts-buster-slim AS runtime

# We'll install curl for later dependency package installation steps
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    openssl \
 && rm -rf /var/lib/apt/lists/*

# Stage 2: Testing Base ========================================================
# This stage will contain the minimal dependencies for the CI/CD environment to
# run the test suite:

# Use the "runtime" stage as base:
FROM runtime AS testing-base

# Install the app build system dependency packages:
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
    build-essential \
    git \
    jq

# Receive the developer user's UID and USER:
ARG DEVELOPER_UID=1000
ARG DEVELOPER_USERNAME=you

# Replicate the developer user in the development image:
RUN id ${DEVELOPER_UID} \
 || useradd -r -m -u ${DEVELOPER_UID} \
    --shell /bin/bash -c "Developer User,,," ${DEVELOPER_USERNAME}

# Ensure the home directory and code paths are owned by the developer user:
# (A workaround to a side effect of setting WORKDIR before creating the user)
RUN mkdir -p /workspaces/tab-saving-extension \
 && chown -R ${DEVELOPER_UID}:node /workspaces/tab-saving-extension

# Add the app's "bin/" directory to PATH:
ENV PATH=/workspaces/tab-saving-extension/bin:$PATH

# Set the app path as the working directory:
WORKDIR /workspaces/tab-saving-extension

# Change to the developer user:
USER ${DEVELOPER_UID}

# Stage 3: Node Packages Testing Dependencies ==================================
#
# We'll use this independent stage to install the node packages required by the
# project, while avoiding cache invalidation if gems are added to the project:
FROM testing-base AS node-testing-base

# Receive the developer username as arguments:
ARG DEVELOPER_UID=1000

# Copy the project's node package dependency lists:
COPY --chown=${DEVELOPER_UID} package.json yarn.lock /workspaces/tab-saving-extension/

# Install the project's node packages:
RUN yarn install

# Stage 5: Testing =============================================================
#
# In this stage we'll merge the bundler gems and the node packages into the
# final testing image, with the minimal dependencies used to run the tests:
FROM testing-base AS testing

# Copy the node packages currently installed in the "Node Testing Base" stage:
COPY --from=node-testing-base /workspaces/tab-saving-extension /workspaces/tab-saving-extension

ENV PATH=/workspaces/tab-saving-extension/node_modules/.bin/:$PATH

# Stage 6: Development =========================================================
# In this stage we'll add the packages, libraries and tools required in the
# day-to-day development process.

# Use the "testing-base" stage as base:
FROM testing-base AS development

# Change to root user to install the development packages:
USER root

# Install sudo, along with any other tool required at development phase:
RUN apt-get install -y --no-install-recommends \
  # Add the bash autocompletion stuff:
  bash-completion \
  # gnupg2 is required to do GPG signed commits:
  gnupg2 \
  inetutils-ping \
  openssh-client \
  # Vim will be used to edit files when inside the container (git, etc):
  vim \
  # Socat is required by Visual Studio Code to connect to the authentication
  # agent in host (ssh, gpg):
  socat \
  # Sudo will be used to install/configure system stuff if needed during dev:
  sudo

# Install Github CLI:
RUN mkdir -p tmp \
 && export GITHUB_CLI_VERSION="2.2.0" \
 && if [ $(arch) = "x86_64" ]; then export ARCH="amd64"; export GITHUB_CLI_SHA256="effdb6df788f1e7af43857bda377c2c86d6905e0fa2b19c74c5552059df65830"; fi \
 && if [ $(arch) = "aarch64" ]; then export ARCH="arm64"; export GITHUB_CLI_SHA256="fe4fa0446e33db0cfc6d4e9a686d2fab36583f0a8db75e520bea5bc95058c0d7"; fi \
 && curl -LJ -o tmp/gh.deb "https://github.com/cli/cli/releases/download/v${GITHUB_CLI_VERSION}/gh_${GITHUB_CLI_VERSION}_linux_${ARCH}.deb" \
 && echo "${GITHUB_CLI_SHA256} tmp/gh.deb" | sha256sum --check \
 && dpkg -i tmp/gh.deb \
 && rm -rf tmp

# Receive the developer username again, as ARGS won't persist between stages on
# non-buildkit builds:
ARG DEVELOPER_UID=1000

# Add the developer user to the sudoers list:
RUN export USERNAME=$(getent passwd ${DEVELOPER_UID} | cut -d: -f1) \
 && echo "${USERNAME} ALL=(ALL) NOPASSWD:ALL" \
  | tee "/etc/sudoers.d/${USERNAME}"

# Change back to the developer user:
USER ${DEVELOPER_UID}

# Copy the node packages currently installed in the "Node Testing Base" stage:
COPY --from=node-testing-base /workspaces/tab-saving-extension /workspaces/tab-saving-extension
ENV PATH=/workspaces/tab-saving-extension/node_modules/.bin/:$PATH

# Stage 4: Builder =============================================================
# In this stage we'll add the rest of the code, compile assets, and perform a
# cleanup for the releasable image.

# Use the "testing" stage as base:
FROM testing AS builder

# Receive the developer username and the app path arguments again, as ARGS
# won't persist between stages on non-buildkit builds:
ARG DEVELOPER_UID=1000

# Copy the full contents of the project:
COPY --chown=${DEVELOPER_UID} . /workspaces/tab-saving-extension/

RUN yarn build
