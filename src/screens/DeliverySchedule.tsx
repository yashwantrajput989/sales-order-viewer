import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { Cell, DataTable, Screen, Section } from "../components/ui";
import { matchesSearch, useScreenRows } from "../lib/api";

// Delivery Schedule — list screen for Sales Order Schedule Lines (SalesOrderScheduleLines via MyBTP AI)
export default function DeliverySchedule() {
  const [searchParams] = useSearchParams();
  const params = useMemo(() => ({ "SalesOrder": searchParams.get("SalesOrder") || "", "SalesOrderItem": searchParams.get("SalesOrderItem") || "" }), [searchParams]);
  const { rows, hasMore, loading, error, reload, loadMore } = useScreenRows("scr_8a07391037cb", params);
  const [search, setSearch] = useState("");
  const visibleRows = useMemo(() => rows.filter((row) => matchesSearch(row, search)), [rows, search]);

  return (
    <Screen title={"Delivery Schedule"}>
      <Section title={"Main"}>
        <Cell span={12}><DataTable title={"Delivery Schedule"} columns={[{ name: "ScheduleLine", label: "Schedule Line", type: "string" }, { name: "RequestedDeliveryDate", label: "Requested Delivery Date", type: "date" }, { name: "ConfirmedDeliveryDate", label: "Confirmed Delivery Date", type: "date" }, { name: "ScheduleLineOrderQuantity", label: "Schedule Line Order Quantity", type: "number" }, { name: "ConfdOrderQtyByMatlAvailCheck", label: "Confd Order Qty By Matl Avail Check", type: "number" }, { name: "DeliveredQtyInOrderQtyUnit", label: "Delivered Qty In Order Qty Unit", type: "number" }, { name: "OrderQuantityUnit", label: "Order Quantity Unit", type: "string" }]} card={{"title":"ScheduleLine","subtitle":["RequestedDeliveryDate","ConfirmedDeliveryDate"],"badge":null,"meta":"ScheduleLineOrderQuantity"}} rows={visibleRows} loading={loading} error={error} hasMore={hasMore} onLoadMore={loadMore} /></Cell>
      </Section>
    </Screen>
  );
}
