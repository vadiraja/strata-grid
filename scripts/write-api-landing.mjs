#!/usr/bin/env node
import { writeFile } from 'node:fs/promises';

const TARGET = 'docs-site/src/content/docs/api/index.mdx';

const CONTENT = `---
title: API reference
description: Public API surface of strata-grid.
sidebar:
  order: 0
---

import { LinkCard, CardGrid } from '@astrojs/starlight/components';

The reference below is auto-generated from TSDoc comments in the source.
Browse the full alphabetical listing in the sidebar, or jump in by category.

## Components

<CardGrid>
  <LinkCard title="DataGrid" href="/strata-grid/api/functions/datagrid/" />
  <LinkCard title="PaginationBar" description="Page navigation" href="/strata-grid/api/variables/paginationbar/" />
  <LinkCard title="QuickSearchInput" description="Debounced search box" href="/strata-grid/api/variables/quicksearchinput/" />
  <LinkCard title="FilterBuilderPanel" description="Nested filter UI" href="/strata-grid/api/variables/filterbuilderpanel/" />
  <LinkCard title="ColumnManagementPanel" description="Show / hide / reorder columns" href="/strata-grid/api/variables/columnmanagementpanel/" />
  <LinkCard title="ExportMenu" description="CSV / XLSX trigger" href="/strata-grid/api/variables/exportmenu/" />
  <LinkCard title="WhereUsedDialog" description="Reverse-lookup results" href="/strata-grid/api/variables/whereuseddialog/" />
</CardGrid>

## Hooks

<CardGrid>
  <LinkCard title="useTreeEditor" href="/strata-grid/api/functions/usetreeeditor/" />
  <LinkCard title="useExport" href="/strata-grid/api/functions/useexport/" />
  <LinkCard title="useDataSource" href="/strata-grid/api/functions/usedatasource/" />
  <LinkCard title="usePagination" href="/strata-grid/api/functions/usepagination/" />
  <LinkCard title="useColumnManagement" href="/strata-grid/api/functions/usecolumnmanagement/" />
  <LinkCard title="useFilterBuilder" href="/strata-grid/api/functions/usefilterbuilder/" />
  <LinkCard title="useQuickSearch" href="/strata-grid/api/functions/usequicksearch/" />
  <LinkCard title="usePrintMode" href="/strata-grid/api/functions/useprintmode/" />
</CardGrid>

## Data sources & adapters

<CardGrid>
  <LinkCard title="InMemoryDataSource" href="/strata-grid/api/classes/inmemorydatasource/" />
  <LinkCard title="ODataDataSource" href="/strata-grid/api/classes/odatadatasource/" />
</CardGrid>

## Theming

<CardGrid>
  <LinkCard title="createTheme" href="/strata-grid/api/functions/createtheme/" />
  <LinkCard title="StrataIcon" href="/strata-grid/api/functions/strataicon/" />
</CardGrid>

> Full alphabetical index: see the [generated modules listing](/strata-grid/api/modules/).
`;

await writeFile(TARGET, CONTENT, 'utf8');
console.log(`Wrote API landing page to ${TARGET}`);
