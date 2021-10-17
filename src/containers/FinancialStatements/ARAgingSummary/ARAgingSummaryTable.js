import React, { useCallback } from 'react';
import intl from 'react-intl-universal';
import DataTable from 'components/DataTable';
import FinancialSheet from 'components/FinancialSheet';

import { useARAgingSummaryContext } from './ARAgingSummaryProvider';
import { useARAgingSummaryColumns } from './components';

/**
 * AR aging summary table sheet.
 */
export default function ReceivableAgingSummaryTable({
  // #ownProps
  organizationName,
}) {
  

  // AR aging summary report context.
  const { ARAgingSummary, isARAgingLoading } = useARAgingSummaryContext();

  // AR aging summary columns.
  const columns = useARAgingSummaryColumns();

  const rowClassNames = (row) => [`row-type--${row.original.rowType}`];

  const handleFetchData = useCallback((...args) => {
    // onFetchData && onFetchData(...args);
  }, []);

  return (
    <FinancialSheet
      companyName={organizationName}
      name={'receivable-aging-summary'}
      sheetType={intl.get('receivable_aging_summary')}
      asDate={new Date()}
      loading={isARAgingLoading}
    >
      <DataTable
        className="bigcapital-datatable--financial-report"
        columns={columns}
        data={ARAgingSummary.tableRows}
        rowClassNames={rowClassNames}
        onFetchData={handleFetchData}
        noInitialFetch={true}
        sticky={true}
      />
    </FinancialSheet>
  );
}