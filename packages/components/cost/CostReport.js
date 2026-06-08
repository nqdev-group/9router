"use client";

import PropTypes from "prop-types";
import CostSummaryCards from "./CostSummaryCards";
import CostByProviderChart from "./CostByProviderChart";
import CostByModelChart from "./CostByModelChart";
import CostTrendChart from "./CostTrendChart";
import CostBreakdownTable from "./CostBreakdownTable";

export default function CostReport({ period, stats, chartData }) {
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <CostSummaryCards stats={stats} period={period} />

      <div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-2">
        <CostByProviderChart stats={stats} />
        <CostByModelChart stats={stats} />
      </div>

      <CostTrendChart chartData={chartData} />

      <CostBreakdownTable stats={stats} />
    </div>
  );
}

CostReport.propTypes = {
  period: PropTypes.string.isRequired,
  stats: PropTypes.object.isRequired,
  chartData: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      cost: PropTypes.number.isRequired,
    })
  ),
};
