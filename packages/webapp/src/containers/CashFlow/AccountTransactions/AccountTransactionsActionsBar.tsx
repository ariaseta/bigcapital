// @ts-nocheck
import React, { useMemo } from 'react';
import {
  Button,
  NavbarGroup,
  Classes,
  NavbarDivider,
  Alignment,
  Popover,
  Menu,
  MenuItem,
  PopoverInteractionKind,
  Position,
  Intent,
} from '@blueprintjs/core';
import { useHistory } from 'react-router-dom';
import {
  Icon,
  DashboardActionsBar,
  DashboardRowsHeightButton,
  FormattedMessage as T,
  AppToaster,
} from '@/components';

import { CashFlowMenuItems } from './utils';
import {
  getAddMoneyOutOptions,
  getAddMoneyInOptions,
} from '@/constants/cashflowOptions';
import { useRefreshCashflowTransactionsInfinity } from '@/hooks/query';
import { useAccountTransactionsContext } from './AccountTransactionsProvider';

import withDialogActions from '@/containers/Dialog/withDialogActions';
import withSettings from '@/containers/Settings/withSettings';
import withSettingsActions from '@/containers/Settings/withSettingsActions';

import { compose } from '@/utils';
import { useDisconnectBankAccount } from '@/hooks/query/bank-rules';

function AccountTransactionsActionsBar({
  // #withDialogActions
  openDialog,

  // #withSettings
  cashflowTansactionsTableSize,

  // #withSettingsActions
  addSetting,
}) {
  const history = useHistory();
  const { accountId } = useAccountTransactionsContext();

  // Refresh cashflow infinity transactions hook.
  const { refresh } = useRefreshCashflowTransactionsInfinity();

  const { mutateAsync: disconnectBankAccount } = useDisconnectBankAccount();

  // Retrieves the money in/out buttons options.
  const addMoneyInOptions = useMemo(() => getAddMoneyInOptions(), []);
  const addMoneyOutOptions = useMemo(() => getAddMoneyOutOptions(), []);

  // Handle table row size change.
  const handleTableRowSizeChange = (size) => {
    addSetting('cashflowTransactions', 'tableSize', size);
  };
  // Handle money in form
  const handleMoneyInFormTransaction = (account) => {
    openDialog('money-in', {
      account_id: accountId,
      account_type: account.value,
      account_name: account.name,
    });
  };
  // Handle money out form
  const handlMoneyOutFormTransaction = (account) => {
    openDialog('money-out', {
      account_id: accountId,
      account_type: account.value,
      account_name: account.name,
    });
  };
  // Handle import button click.
  const handleImportBtnClick = () => {
    history.push(`/cashflow-accounts/${accountId}/import`);
  };
  // Handle bank rules click.
  const handleBankRulesClick = () => {
    history.push(`/bank-rules?accountId=${accountId}`);
  };

  const isConnected = true;

  // Handles the bank account disconnect click.
  const handleDisconnectClick = () => {
    disconnectBankAccount(accountId)
      .then(() => {
        AppToaster.show({
          message: 'The bank account has been disconnected.',
          intent: Intent.SUCCESS,
        });
      })
      .catch((error) => {
        AppToaster.show({
          message: 'Something went wrong.',
          intent: Intent.DANGER,
        });
      });
  };

  // Handle the refresh button click.
  const handleRefreshBtnClick = () => {
    refresh();
  };

  return (
    <DashboardActionsBar>
      <NavbarGroup>
        <CashFlowMenuItems
          items={addMoneyInOptions}
          onItemSelect={handleMoneyInFormTransaction}
          text={<T id={'cash_flow.label.add_money_in'} />}
          buttonProps={{
            icon: <Icon icon={'arrow-downward'} iconSize={20} />,
          }}
        />
        <CashFlowMenuItems
          items={addMoneyOutOptions}
          onItemSelect={handlMoneyOutFormTransaction}
          text={<T id={'cash_flow.label.add_money_out'} />}
          buttonProps={{
            icon: <Icon icon={'arrow-upward'} iconSize={20} />,
          }}
        />
        <NavbarDivider />
        <Button
          className={Classes.MINIMAL}
          icon={<Icon icon="print-16" iconSize={16} />}
          text={<T id={'print'} />}
        />
        <Button
          className={Classes.MINIMAL}
          icon={<Icon icon="file-export-16" iconSize={16} />}
          text={<T id={'export'} />}
        />
        <Button
          className={Classes.MINIMAL}
          icon={<Icon icon="file-import-16" iconSize={16} />}
          text={<T id={'import'} />}
          onClick={handleImportBtnClick}
        />
        <NavbarDivider />
        <DashboardRowsHeightButton
          initialValue={cashflowTansactionsTableSize}
          onChange={handleTableRowSizeChange}
        />
        <NavbarDivider />
      </NavbarGroup>

      <NavbarGroup align={Alignment.RIGHT}>
        <Popover
          minimal={true}
          interactionKind={PopoverInteractionKind.CLICK}
          position={Position.BOTTOM_RIGHT}
          modifiers={{
            offset: { offset: '0, 4' },
          }}
          content={
            <Menu>
              <MenuItem onClick={handleBankRulesClick} text={'Bank rules'} />

              {isConnected && (
                <MenuItem onClick={handleDisconnectClick} text={'Disconnect'} />
              )}
            </Menu>
          }
        >
          <Button icon={<Icon icon="cog-16" iconSize={16} />} minimal={true} />
        </Popover>
        <NavbarDivider />
        <Button
          className={Classes.MINIMAL}
          icon={<Icon icon="refresh-16" iconSize={14} />}
          onClick={handleRefreshBtnClick}
        />
      </NavbarGroup>
    </DashboardActionsBar>
  );
}

export default compose(
  withDialogActions,
  withSettingsActions,
  withSettings(({ cashflowTransactionsSettings }) => ({
    cashflowTansactionsTableSize: cashflowTransactionsSettings?.tableSize,
  })),
)(AccountTransactionsActionsBar);
