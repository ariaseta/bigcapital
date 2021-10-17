import React from 'react';
import { Link } from 'react-router-dom';
import { For } from 'components';

import DashboardInsider from 'components/Dashboard/DashboardInsider';
import {
  financialReportMenus,
  SalesAndPurchasesReportMenus,
} from 'config/financialReportsMenu';

import 'style/pages/FinancialStatements/FinancialSheets.scss';

function FinancialReportsItem({ title, desc, link }) {
  return (
    <div class="financial-reports__item">
      <Link class="title" to={link}>
        {title}
      </Link>
      <p class="desc">{desc}</p>
    </div>
  );
}

function FinancialReportsSection({ sectionTitle, reports }) {
  return (
    <div class="financial-reports__section">
      <div class="section-title">{sectionTitle}</div>

      <div class="financial-reports__list">
        <For render={FinancialReportsItem} of={reports} />
      </div>
    </div>
  );
}

/**
 * Financial reports.
 */
export default function FinancialReports() {
  return (
    <DashboardInsider name={'financial-reports'}>
      <div class="financial-reports">
        <For render={FinancialReportsSection} of={financialReportMenus} />
        <For
          render={FinancialReportsSection}
          of={SalesAndPurchasesReportMenus}
        />
      </div>
    </DashboardInsider>
  );
}