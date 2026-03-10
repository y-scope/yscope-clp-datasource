import { getBackendSrv } from '@grafana/runtime';
import {
  CoreApp,
  DataQueryRequest,
  DataQueryResponse,
  DataSourceApi,
  DataSourceInstanceSettings,
  createDataFrame,
  FieldType,
  TimeRange,
  DataFrameType,
} from '@grafana/data';

import { SearchQuery, ClpDataSourceOptions, DEFAULT_QUERY } from './types';
import { Observable, forkJoin, zip, lastValueFrom } from 'rxjs';
import { map, switchMap, reduce } from 'rxjs/operators';
import { createParser, type EventSourceMessage, type ParseError } from 'eventsource-parser';

interface QueryConfig {
  query_string: string;
  datasets?: string[];
  max_num_results?: number;
  time_range_begin_millisecs?: number;
  time_range_end_millisecs?: number;
  ignore_case?: boolean;
  buffer_results_in_mongodb?: boolean;
}

interface QueryResponse {
  query_results_uri: string;
}

export class DataSource extends DataSourceApi<SearchQuery, ClpDataSourceOptions> {
  baseUrl: string;

  constructor(instanceSettings: DataSourceInstanceSettings<ClpDataSourceOptions>) {
    super(instanceSettings);
    this.baseUrl = instanceSettings.url!;
  }

  getDefaultQuery(_: CoreApp): Partial<SearchQuery> {
    return DEFAULT_QUERY;
  }

  filterQuery(query: SearchQuery): boolean {
    return query.queryText !== '';
  }

  #submitQuery(query: SearchQuery, range: TimeRange): Observable<string> {
    const config: QueryConfig = {
      query_string: query.queryText,
      datasets: 'undefined' === typeof query.dataset ? ['default'] : [query.dataset],
      max_num_results: query.maxNumResults,
      ignore_case: query.ignoreCase,
      buffer_results_in_mongodb: true,
      time_range_begin_millisecs: range.from.valueOf(),
      time_range_end_millisecs: range.to.valueOf(),
    };

    return getBackendSrv()
      .fetch<QueryResponse>({
        url: `${this.baseUrl}/query`,
        method: 'POST',
        data: config,
      })
      .pipe(map((response) => response.data.query_results_uri));
  }

  #cancelQuery(searchJobId: string): void {
    getBackendSrv()
      .fetch({
        url: `${this.baseUrl}/query/${searchJobId}`,
        method: 'DELETE',
      })
      .subscribe();
  }

  #fetchQueryResults(queryResultsUri: string): Observable<string[]> {
    const dataBuffer: string[] = [];
    const parser = createParser({
      onEvent: (event: EventSourceMessage) => {
        dataBuffer.push(event.data);
      },
      onError: (error: ParseError) => {
        throw new Error('Error while parsing event stream.', { cause: error });
      },
    });

    return getBackendSrv()
      .fetch<string>({
        url: `${this.baseUrl}${queryResultsUri}`,
        method: 'GET',
      })
      .pipe(
        reduce((_acc, dataResponse) => {
          parser.feed(dataResponse.data);
          return dataBuffer;
        }, dataBuffer)
      );
  }

  #fetchTimestampColumnNames(dataset: string): Observable<string[]> {
    return getBackendSrv()
      .fetch<string[]>({
        url: `${this.baseUrl}/column_metadata/${dataset}/timestamp`,
        method: 'GET',
      })
      .pipe(map((response) => response.data));
  }

  #extractField(message: unknown, columnName: string): unknown {
const fieldPath = columnName.split(/(?<!\\)\./).map(s => s.replace(/\\\./g, '.'));
    let current = message;
    for (const segment of fieldPath) {
      current = (current as Record<string, unknown>)[segment];
    }
    return current;
  }

  query(options: DataQueryRequest<SearchQuery>): Observable<DataQueryResponse> {
    const queryResultsObservables = options.targets.map((target) =>
      this.#submitQuery(target, options.range).pipe(
        switchMap((uri) => {
          const searchJobId = uri.split('/').pop()!;
          return new Observable<string[]>((subscriber) => {
            let completed = false;
            const sub = this.#fetchQueryResults(uri).subscribe({
              next: (val) => {
                subscriber.next(val);
              },
              error: (err) => {
                completed = true;
                subscriber.error(err);
              },
              complete: () => {
                completed = true;
                subscriber.complete();
              },
            });
            return () => {
              sub.unsubscribe();
              if (!completed) {
                this.#cancelQuery(searchJobId);
              }
            };
          });
        })
      )
    );

    const timestampColumnNamesObservables = options.targets.map((target) =>
      this.#fetchTimestampColumnNames(target.dataset ?? 'default')
    );

    const dataframeObservables = options.targets.map((target, i) =>
      zip(timestampColumnNamesObservables[i], queryResultsObservables[i]).pipe(
        map(([timestampColumnNames, dataBuffer]) => {
          const fields = [];

          const values = target.maxNumResults ? dataBuffer.slice(0, target.maxNumResults) : dataBuffer;
          fields.push({ name: 'body', values, type: FieldType.string });

          const [timestampColumnName] = timestampColumnNames;
          if ('undefined' !== typeof timestampColumnName) {
            const parsedValues = values.map((line) => JSON.parse(line));
            const timestamps = parsedValues.map((parsedValue) => {
              try {
                return this.#extractField(parsedValue, timestampColumnName);
              } catch (err: unknown) {
                return null;
              }
            });
            fields.push({ name: "timestamp", values: timestamps, type: FieldType.time });
          }

          return createDataFrame({
            refId: target.refId,
            fields: fields,
            meta: {
              type: DataFrameType.LogLines,
              preferredVisualisationType: 'logs',
            },
          });
        })
      )
    );

    return forkJoin(dataframeObservables).pipe(map((data) => ({ data })));
  }

  async testDatasource() {
    const observable = getBackendSrv().fetch<string>({ url: `${this.baseUrl}/health` });
    try {
      await lastValueFrom(observable);
      return {
        status: 'success',
        message: 'Success',
      };
    } catch (e) {
      return {
        status: 'error',
        message: 'Cannot connect to CLP.',
      };
    }
  }
}
