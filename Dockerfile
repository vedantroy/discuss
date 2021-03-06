# base node image
FROM node:16-bullseye-slim as base

# Install unzip, curl for dprint
RUN apt-get update && apt-get install -y unzip curl

# Install all node_modules, including dev dependencies
FROM base as deps

RUN mkdir /app
WORKDIR /app

ENV METRONOME_API_KEY=$METRONOME_API_KEY

ADD package.json package-lock.json patches ./
RUN npm install --production=false

# Setup production node_modules
FROM base as production-deps

RUN mkdir /app
WORKDIR /app

COPY --from=deps /app/node_modules /app/node_modules
ADD package.json package-lock.json patches ./
RUN npm prune --production

# Build the app
FROM base as build

ENV NODE_ENV=production
ENV METRONOME_API_KEY=$METRONOME_API_KEY

RUN mkdir /app
WORKDIR /app

COPY --from=deps /app/node_modules /app/node_modules

ADD . .

RUN npm run build:prod

# Finally, build the production image with minimal footprint
FROM base

ENV NODE_ENV=production

RUN mkdir /app
WORKDIR /app

COPY --from=production-deps /app/node_modules /app/node_modules
# EDGEDB
COPY ./dbschema /app/dbschema

COPY --from=build /app/build /app/build
COPY --from=build /app/public /app/public
ADD package.json ./

CMD ["npm", "run", "start"]
