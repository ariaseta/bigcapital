import React from 'react';
import {
  Menu,
  MenuDivider,
  MenuItem,
  Intent,
  Tag,
  Position,
  Button,
  Popover,
} from '@blueprintjs/core';
import intl from 'react-intl-universal';
import moment from 'moment';

import { FormattedMessage as T } from 'components';
import { isNumber } from 'lodash';
import { Icon, Money, If } from 'components';
import { isBlank, safeCallback } from 'utils';

/**
 * Publish accessor
 */
export const PublishAccessor = (r) => {
  return r.is_published ? (
    <Tag minimal={true}>
      <T id={'published'} />
    </Tag>
  ) : (
    <Tag minimal={true} intent={Intent.WARNING}>
      <T id={'draft'} />
    </Tag>
  );
};

/**
 * Type column accessor.
 */
export const TypeAccessor = (row) => {
  return row.type ? (
    <Tag minimal={true} round={true} intent={Intent.NONE}>
      {intl.get(row.type)}
    </Tag>
  ) : (
    ''
  );
};

/**
 * Item type accessor.
 */
export const ItemCodeAccessor = (row) =>
  row.type ? (
    <Tag minimal={true} round={true} intent={Intent.NONE}>
      {intl.get(row.type)}
    </Tag>
  ) : (
    ''
  );

/**
 * Quantity on hand cell.
 */
export const QuantityOnHandCell = ({ cell: { value } }) => {
  return isNumber(value) ? (
    <span className={'quantity_on_hand'}>{value}</span>
  ) : null;
};

/**
 * Cost price cell.
 */
export const CostPriceCell = ({ cell: { value } }) => {
  return !isBlank(value) ? <Money amount={value} currency={'USD'} /> : null;
};

/**
 * Sell price cell.
 */
export const SellPriceCell = ({ cell: { value } }) => {
  return !isBlank(value) ? <Money amount={value} currency={'USD'} /> : null;
};

/**
 * Item type accessor.
 */
export const ItemTypeAccessor = (row) => {
  return row.type ? (
    <Tag minimal={true} round={true} intent={Intent.NONE}>
      {intl.get(row.type)}
    </Tag>
  ) : null;
};

export const ActionsMenu = ({
  row: { original },
  payload: { onDelete, onPublish },
}) => {
  return (
    <Menu>
      <MenuItem
        icon={<Icon icon="reader-18" />}
        text={intl.get('view_details')}
      />
      <MenuDivider />
      <If condition={!original.is_published}>
        <MenuItem
          icon={<Icon icon={'arrow-to-top'} size={16} />}
          text={intl.get('publish_adjustment')}
          onClick={safeCallback(onPublish, original)}
        />
      </If>
      <MenuItem
        text={intl.get('delete_adjustment')}
        intent={Intent.DANGER}
        onClick={safeCallback(onDelete, original)}
        icon={<Icon icon="trash-16" iconSize={16} />}
      />
    </Menu>
  );
};

export const ActionsCell = (props) => {
  return (
    <Popover
      content={<ActionsMenu {...props} />}
      position={Position.RIGHT_BOTTOM}
    >
      <Button icon={<Icon icon="more-h-16" iconSize={16} />} />
    </Popover>
  );
};

/**
 * Retrieve inventory adjustments columns.
 */
export const useInventoryAdjustmentsColumns = () => {
  return React.useMemo(
    () => [
      {
        id: 'date',
        Header: intl.get('date'),
        accessor: (r) => moment(r.date).format('YYYY MMM DD'),
        width: 115,
        className: 'date',
      },
      {
        id: 'type',
        Header: intl.get('type'),
        accessor: TypeAccessor,
        className: 'type',
        width: 100,
      },
      {
        id: 'reason',
        Header: intl.get('reason'),
        accessor: 'reason',
        className: 'reason',
        width: 115,
      },
      {
        id: 'reference_no',
        Header: intl.get('reference_no'),
        accessor: 'reference_no',
        className: 'reference_no',
        width: 100,
      },
      {
        id: 'published_at',
        Header: intl.get('status'),
        accessor: PublishAccessor,
        width: 95,
        className: 'publish',
      },
      {
        id: 'description',
        Header: intl.get('description'),
        accessor: 'description',
        disableSorting: true,
        width: 85,
        className: 'description',
      },
      {
        id: 'created_at',
        Header: intl.get('created_at'),
        accessor: (r) => moment(r.created_at).format('YYYY MMM DD'),
        width: 125,
        className: 'created_at',
      },
    ],
    [],
  );
};
