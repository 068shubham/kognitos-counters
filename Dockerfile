FROM node:18.16.0

WORKDIR /opt/org/kognitos-counters

COPY . .
RUN rm -rf node_modules \
    && rm -rf dist \
    && npm i \
    && npm run build
RUN chmod +x /opt/org/kognitos-counters/start.sh

ENTRYPOINT ["/opt/org/kognitos-counters/start.sh"]