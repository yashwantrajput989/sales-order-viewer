import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Cell, DataTable, Screen, SearchBar, Section } from "../components/ui";
import { matchesSearch, recordId, useScreenRows } from "../lib/api";

// Sales Orders — list screen for Sales Orders (SalesOrders via MyBTP AI)
export default function SalesOrders() {
  const navigate = useNavigate();
  const { rows, hasMore, loading, error, reload, loadMore } = useScreenRows("scr_941de21f0969");
  const [search, setSearch] = useState("");
  const visibleRows = useMemo(() => rows.filter((row) => matchesSearch(row, search)), [rows, search]);

  return (
    <Screen title={"Sales Orders"}>
      <Section title={"Main"}>
        <Cell span={12}><SearchBar value={search} onChange={setSearch} placeholder={"Search sales orders…"} /></Cell>
        <Cell span={12}><DataTable title={"Sales Orders"} columns={[{ name: "SalesOrder", label: "Sales Order", type: "string" }, { name: "SoldToParty", label: "Sold To Party", type: "string" }, { name: "SalesOrderType", label: "Sales Order Type", type: "string" }, { name: "SalesOrganization", label: "Sales Organization", type: "string" }, { name: "SalesOrderDate", label: "Sales Order Date", type: "date" }, { name: "TotalNetAmount", label: "Total Net Amount", type: "currency" }, { name: "TransactionCurrency", label: "Transaction Currency", type: "string" }, { name: "OverallSDProcessStatus", label: "Overall SD Process Status", type: "string" }]} card={{"title":"SalesOrder","subtitle":["SoldToParty","SalesOrderType"],"badge":"OverallSDProcessStatus","meta":"TotalNetAmount"}} rows={visibleRows} loading={loading} error={error} hasMore={hasMore} onLoadMore={loadMore} onRowClick={(row) => navigate("/sales-order-details/" + recordId("SalesOrders", row))} /></Cell>
      </Section>
    </Screen>
  );
}
