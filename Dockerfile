FROM node:18.16.0

WORKDIR /opt/org/kognitos-counters

COPY . .
RUN chmod +x /opt/org/project-1/setup.sh

ENTRYPOINT ["/opt/org/kognitos-counters/start.sh"]