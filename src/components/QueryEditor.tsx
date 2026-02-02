/* eslint-disable @typescript-eslint/no-deprecated */
import React, { ChangeEvent } from 'react';
import { Input, Select, TextArea } from '@grafana/ui';
import { QueryEditorProps, SelectableValue } from '@grafana/data';
import { DataSource } from '../datasource';
import { ClpDataSourceOptions, SearchQuery } from '../types';
import { EditorField, EditorRow } from '@grafana/plugin-ui';

type Props = QueryEditorProps<DataSource, SearchQuery, ClpDataSourceOptions>;

const ignoreCaseOptions: Array<SelectableValue<boolean>> = [
  { label: 'Yes', value: true },
  { label: 'No', value: false },
];

const maxResultsOptions: Array<SelectableValue<number>> = [
  { label: '10', value: 10 },
  { label: '50', value: 50 },
  { label: '100', value: 100 },
  { label: '500', value: 500 },
  { label: '1000', value: 1000 },
  { label: '5000', value: 5000 },
  { label: '10000', value: 10000 },
];

export function QueryEditor({ query, onChange }: Props) {
  const onQueryTextChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    onChange({ ...query, queryText: event.target.value });
  };

  const onDatasetChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange({ ...query, dataset: event.target.value });
  };

  const onMaxNumResultsChange = (option: SelectableValue<number>) => {
    onChange({ ...query, maxNumResults: option.value });
  };

  const onIgnoreCaseChange = (option: SelectableValue<boolean>) => {
    onChange({ ...query, ignoreCase: option.value });
  };

  const { queryText, dataset, maxNumResults = 1000, ignoreCase = false } = query;

  return (
    <>
      <EditorRow>
        <EditorField label="Dataset" width={25}>
          <Input onChange={onDatasetChange} value={dataset} placeholder={'default'} type="string" />
        </EditorField>

        <EditorField label="Ignore Case">
          <Select
            options={ignoreCaseOptions}
            value={ignoreCase}
            onChange={onIgnoreCaseChange}
            placeholder={'No'}
            width={8}
          />
        </EditorField>

        <EditorField label="Max Results">
          <Select
            options={maxResultsOptions}
            value={maxNumResults}
            onChange={onMaxNumResultsChange}
            placeholder={'1000'}
            width={12}
          />
        </EditorField>
      </EditorRow>
      <EditorRow>
        <EditorField label="Query Text" width="100%">
          <TextArea onChange={onQueryTextChange} value={queryText} required placeholder="Enter a query" />
        </EditorField>
      </EditorRow>
    </>
  );
}
