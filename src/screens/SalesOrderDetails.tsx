import { useNavigate, useParams } from "react-router-dom";

import { ActionButton, Cell, FieldView, ObjectHeader, Screen, Section, StateMessage } from "../components/ui";
import { paramsFrom, useEntityRecord } from "../lib/api";

// Sales Order Details — record screen for Sales Orders (SalesOrders via MyBTP AI)
export default function SalesOrderDetails() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { record, loading, error, reload } = useEntityRecord("SalesOrders", id);

  return (
    <Screen title={"Sales Order Details"}>
      <StateMessage loading={loading} error={error} />
      <Section title={"Main"}>
        <Cell span={12}><ObjectHeader title={String(record?.["SalesOrder"] ?? "")} subtitle={"Sales Orders"} /></Cell>
        <Cell span={6}><FieldView label={"Sales Order"} value={record?.["SalesOrder"]} type={"string"} /></Cell>
        <Cell span={6}><FieldView label={"Overall SD Process Status"} value={record?.["OverallSDProcessStatus"]} type={"string"} /></Cell>
        <Cell span={6}><FieldView label={"Total Net Amount"} value={record?.["TotalNetAmount"]} type={"currency"} /></Cell>
        <Cell span={6}><FieldView label={"Transaction Currency"} value={record?.["TransactionCurrency"]} type={"string"} /></Cell>
        <Cell span={6}><FieldView label={"Sold To Party"} value={record?.["SoldToParty"]} type={"string"} /></Cell>
        <Cell span={6}><FieldView label={"Sales Order Type"} value={record?.["SalesOrderType"]} type={"string"} /></Cell>
        <Cell span={6}><FieldView label={"Sales Organization"} value={record?.["SalesOrganization"]} type={"string"} /></Cell>
        <Cell span={6}><FieldView label={"Distribution Channel"} value={record?.["DistributionChannel"]} type={"string"} /></Cell>
        <Cell span={6}><FieldView label={"Organization Division"} value={record?.["OrganizationDivision"]} type={"string"} /></Cell>
        <Cell span={6}><FieldView label={"Sales Order Date"} value={record?.["SalesOrderDate"]} type={"date"} /></Cell>
        <Cell span={6}><FieldView label={"Requested Delivery Date"} value={record?.["RequestedDeliveryDate"]} type={"date"} /></Cell>
        <Cell span={6}><FieldView label={"Purchase Order By Customer"} value={record?.["PurchaseOrderByCustomer"]} type={"string"} /></Cell>
        <Cell span={6}><FieldView label={"Overall Delivery Status"} value={record?.["OverallDeliveryStatus"]} type={"string"} /></Cell>
        <Cell span={6}><FieldView label={"Customer Payment Terms"} value={record?.["CustomerPaymentTerms"]} type={"string"} /></Cell>
        <Cell span={6}><FieldView label={"Incoterms Classification"} value={record?.["IncotermsClassification"]} type={"string"} /></Cell>
        <Cell span={6}><FieldView label={"Created By User"} value={record?.["CreatedByUser"]} type={"string"} /></Cell>
        <Cell span={4}><ActionButton variant="default" onClick={() => navigate("/line-items" + paramsFrom(record, ["SalesOrder"]))}>{"Line Items"}</ActionButton></Cell>
        <Cell span={4}><ActionButton variant="default" onClick={() => navigate("/partners" + paramsFrom(record, ["SalesOrder"]))}>{"Partners"}</ActionButton></Cell>
        <Cell span={4}><ActionButton variant="default" onClick={() => navigate("/deliveries-invoices" + paramsFrom(record, ["SalesOrder"]))}>{"Deliveries & Invoices"}</ActionButton></Cell>
      </Section>
    </Screen>
  );
}
