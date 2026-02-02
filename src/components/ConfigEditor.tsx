import React from 'react';
import { DataSourcePluginOptionsEditorProps } from '@grafana/data';
import { ConnectionSettings, DataSourceDescription } from '@grafana/plugin-ui';
import { Divider } from '@grafana/ui';

export function ConfigEditor(props: DataSourcePluginOptionsEditorProps) {
  const { onOptionsChange, options } = props;

  return (
    <>
      <DataSourceDescription dataSourceName="CLP" docsLink="https://docs.yscope.com/" hasRequiredFields={true} />
      <Divider />
      <ConnectionSettings
        config={options}
        onChange={onOptionsChange}
        urlLabel={'API Server URL'}
        urlPlaceholder={'http://localhost:3001/'}
      />
    </>
  );
}
