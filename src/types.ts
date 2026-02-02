import { DataQuery } from '@grafana/schema';

export interface SearchQuery extends DataQuery {
  queryText: string;
  dataset?: string;
  maxNumResults?: number;
  ignoreCase?: boolean;
}

export const DEFAULT_QUERY: Partial<SearchQuery> = {
  dataset: 'default',
};

export interface ClpDataSourceOptions {}
