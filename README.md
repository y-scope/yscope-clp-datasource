# CLP Datasource Plugin for Grafana

A [Grafana](https://grafana.com/) datasource plugin for querying and visualizing log data from a
[CLP](https://github.com/y-scope/clp) API server.

## Requirements

- Node.js >= 22
- Docker (for running the local Grafana instance)
- A running CLP instance

## Getting started

### Start the plugin and a dedicated Grafana deployment

Install the dependencies:

```bash
npm clean-install
```

Build the plugin and start the server:

```bash
npm run build
npm run server
```

### Usage

1. Open Grafana at http://localhost:3000.

2. Connect the datasource to a CLP API server:
   - Navigate to **Connections > Data sources > CLP**.
   - Enter the API server URL (e.g., `http://<CLP_API_SERVER_HOST>:<PORT>`).
   - Click **Save & test** to verify connectivity.

3. Build a dashboard:
   - Add a visualization and choose **CLP** as the datasource.
   - Configure your query in the query editor:
     - **Dataset**: the dataset to search (defaults to `default`).
     - **Query Text**: the search query string.
     - **Ignore Case**: whether to perform a case-insensitive search.
     - **Max Results**: the maximum number of results to return.
   - Set the desired time range and click **Refresh** to run the query.
   - To view results in the Logs panel:
     1. Select the **Logs** visualization in the top right.
     2. Add an **Extract fields** transformation and choose **JSON** as the format.
     3. Add a **Convert field type** transformation to convert your timestamp field to the
        **Time** type.

## Test the plugin in an existing Grafana deployment

1. Clone the repo into the Grafana plugins directory (usually `/usr/share/grafana/public/app/plugins/datasource/`).

2. Restart Grafana. You should then be able to set up a new CLP datasource.
