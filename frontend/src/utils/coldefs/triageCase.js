import {
  UrgencyCellRenderer,
  urgencyComparator,
  dateTimeFormatter,
  ageValueGetter,
  EditCaseButtonCellRenderer,
} from '../gridUtils';

export const triageCaseColumnDefs = [
  {
    headerName: 'Urgency',
    flex: 1, // flex determines the proportion the column will take up
    minWidth: 150, // set minimum width to create overflow on smaller window sizes
    cellRenderer: UrgencyCellRenderer,
    filter: 'agTextColumnFilter',
    comparator: urgencyComparator,
    sort: "asc",
    valueGetter: (params) => {
      return params.data.overrideUrgency || params.data.AIUrgency;
    }
  },
  {
    headerName: 'First Name',
    field: 'firstName',
    flex: 0.75,
    minWidth: 150,
    filter: 'agTextColumnFilter',
  },
  {
    headerName: 'Last Name',
    field: 'lastName',
    flex: 0.75,
    minWidth: 150,
    filter: 'agTextColumnFilter',
  },
  {
    headerName: 'Age',
    field: 'DOB',
    flex: 0.5,
    minWidth: 100,
    filter: 'agNumberColumnFilter',
    valueGetter: (params) => ageValueGetter(params.data?.DOB),
  },
  {
    headerName: 'Date',
    field: 'dateCreated',
    flex: 0.75,
    minWidth: 200,
    valueFormatter: dateTimeFormatter,
    filter: 'agDateColumnFilter',
  },
  {
    headerName: 'Summary',
    flex: 6,
    minWidth: 300,
    tooltipValueGetter: (params) => {
      return params.data.overrideSummary || params.data.AISummary;
    },
    filter: 'agTextColumnFilter',
    valueGetter: (params) => {
      return params.data.overrideSummary || params.data.AISummary;
    }
  },
  {
    headerName: 'Edit',
    flex: 0.5,
    minWidth: 100,
    cellRenderer: EditCaseButtonCellRenderer,
    sortable: false,
  },
];