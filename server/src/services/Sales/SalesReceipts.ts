import { omit, sumBy } from 'lodash';
import { Service, Inject } from 'typedi';
import moment from 'moment';
import {
  EventDispatcher,
  EventDispatcherInterface,
} from 'decorators/eventDispatcher';
import events from 'subscribers/events';
import JournalPoster from 'services/Accounting/JournalPoster';
import JournalCommands from 'services/Accounting/JournalCommands';
import { ISaleReceipt, ISaleReceiptDTO, IItemEntry, IItem } from 'interfaces';
import JournalPosterService from 'services/Sales/JournalPosterService';
import TenancyService from 'services/Tenancy/TenancyService';
import { formatDateFields } from 'utils';
import { IFilterMeta, IPaginationMeta } from 'interfaces';
import DynamicListingService from 'services/DynamicListing/DynamicListService';
import { ServiceError } from 'exceptions';
import ItemsEntriesService from 'services/Items/ItemsEntriesService';
import { ItemEntry } from 'models';
import InventoryService from 'services/Inventory/Inventory';
import { ACCOUNT_PARENT_TYPE } from 'data/AccountTypes';
import AutoIncrementOrdersService from './AutoIncrementOrdersService';

const ERRORS = {
  SALE_RECEIPT_NOT_FOUND: 'SALE_RECEIPT_NOT_FOUND',
  DEPOSIT_ACCOUNT_NOT_FOUND: 'DEPOSIT_ACCOUNT_NOT_FOUND',
  DEPOSIT_ACCOUNT_NOT_CURRENT_ASSET: 'DEPOSIT_ACCOUNT_NOT_CURRENT_ASSET',
  SALE_RECEIPT_NUMBER_NOT_UNIQUE: 'SALE_RECEIPT_NUMBER_NOT_UNIQUE',
  SALE_RECEIPT_IS_ALREADY_CLOSED: 'SALE_RECEIPT_IS_ALREADY_CLOSED',
  SALE_RECEIPT_NO_IS_REQUIRED: 'SALE_RECEIPT_NO_IS_REQUIRED'
};

@Service()
export default class SalesReceiptService {
  @Inject()
  tenancy: TenancyService;

  @Inject()
  dynamicListService: DynamicListingService;

  @Inject()
  journalService: JournalPosterService;

  @Inject()
  itemsEntriesService: ItemsEntriesService;

  @Inject()
  inventoryService: InventoryService;

  @EventDispatcher()
  eventDispatcher: EventDispatcherInterface;

  @Inject('logger')
  logger: any;

  @Inject()
  autoIncrementOrdersService: AutoIncrementOrdersService;

  /**
   * Validate whether sale receipt exists on the storage.
   * @param {number} tenantId -
   * @param {number} saleReceiptId -
   */
  async getSaleReceiptOrThrowError(tenantId: number, saleReceiptId: number) {
    const { SaleReceipt } = this.tenancy.models(tenantId);

    this.logger.info('[sale_receipt] trying to validate existance.', {
      tenantId,
      saleReceiptId,
    });
    const foundSaleReceipt = await SaleReceipt.query()
      .findById(saleReceiptId)
      .withGraphFetched('entries');

    if (!foundSaleReceipt) {
      this.logger.info('[sale_receipt] not found on the storage.', {
        tenantId,
        saleReceiptId,
      });
      throw new ServiceError(ERRORS.SALE_RECEIPT_NOT_FOUND);
    }
    return foundSaleReceipt;
  }

  /**
   * Validate whether sale receipt deposit account exists on the storage.
   * @param {number} tenantId - Tenant id.
   * @param {number} accountId - Account id.
   */
  async validateReceiptDepositAccountExistance(
    tenantId: number,
    accountId: number
  ) {
    const { accountRepository } = this.tenancy.repositories(tenantId);
    const depositAccount = await accountRepository.findOneById(accountId);

    if (!depositAccount) {
      throw new ServiceError(ERRORS.DEPOSIT_ACCOUNT_NOT_FOUND);
    }
    if (!depositAccount.isParentType(ACCOUNT_PARENT_TYPE.CURRENT_ASSET)) {
      throw new ServiceError(ERRORS.DEPOSIT_ACCOUNT_NOT_CURRENT_ASSET);
    }
  }

  /**
   * Validate sale receipt number uniquiness on the storage.
   * @param {number} tenantId -
   * @param {string} receiptNumber -
   * @param {number} notReceiptId -
   */
  async validateReceiptNumberUnique(
    tenantId: number,
    receiptNumber: string,
    notReceiptId?: number
  ) {
    const { SaleReceipt } = this.tenancy.models(tenantId);

    this.logger.info('[sale_receipt] validate receipt number uniquiness.', {
      tenantId,
      receiptNumber,
    });
    const saleReceipt = await SaleReceipt.query()
      .findOne('receipt_number', receiptNumber)
      .onBuild((builder) => {
        if (notReceiptId) {
          builder.whereNot('id', notReceiptId);
        }
      });

    if (saleReceipt) {
      this.logger.info('[sale_receipt] sale receipt number not unique.', {
        tenantId,
      });
      throw new ServiceError(ERRORS.SALE_RECEIPT_NUMBER_NOT_UNIQUE);
    }
  }

  /**
   * Validate the sale receipt number require.
   * @param {ISaleReceipt} saleReceipt
   */
  validateReceiptNoRequire(saleReceipt: ISaleReceipt) {
    if (!saleReceipt.receiptNumber) {
      throw new ServiceError(ERRORS.SALE_RECEIPT_NO_IS_REQUIRED);
    }
  }

  /**
   * Retrieve the next unique receipt number.
   * @param  {number} tenantId - Tenant id.
   * @return {string}
   */
  getNextReceiptNumber(tenantId: number): string {
    return this.autoIncrementOrdersService.getNextTransactionNumber(
      tenantId,
      'sales_receipts'
    );
  }

  /**
   * Increment the receipt next number.
   * @param {number} tenantId -
   */
  incrementNextReceiptNumber(tenantId: number) {
    return this.autoIncrementOrdersService.incrementSettingsNextNumber(
      tenantId,
      'sales_receipts'
    );
  }

  /**
   * Retrieve estimate number to object model.
   * @param {number} tenantId
   * @param {ISaleReceiptDTO} saleReceiptDTO - Sale receipt DTO.
   * @param {ISaleReceipt} oldSaleReceipt - Old receipt model object.
   */
  transformReceiptNumberToModel(
    tenantId: number,
    saleReceiptDTO: ISaleReceiptDTO,
    oldSaleReceipt?: ISaleReceipt
  ): string {
    // Retreive the next invoice number.
    const autoNextNumber = this.getNextReceiptNumber(tenantId);

    if (saleReceiptDTO.receiptNumber) {
      return saleReceiptDTO.receiptNumber;
    }
    return oldSaleReceipt ? oldSaleReceipt.receiptNumber : autoNextNumber;
  }

  /**
   * Transform DTO object to model object.
   * @param {ISaleReceiptDTO} saleReceiptDTO -
   * @param {ISaleReceipt} oldSaleReceipt -
   * @returns {ISaleReceipt}
   */
  transformObjectDTOToModel(
    tenantId: number,
    saleReceiptDTO: ISaleReceiptDTO,
    oldSaleReceipt?: ISaleReceipt
  ): ISaleReceipt {
    const amount = sumBy(saleReceiptDTO.entries, (e) =>
      ItemEntry.calcAmount(e)
    );
    // Retreive the receipt number.
    const receiptNumber = this.transformReceiptNumberToModel(
      tenantId,
      saleReceiptDTO,
      oldSaleReceipt
    );

    return {
      amount,
      ...formatDateFields(omit(saleReceiptDTO, ['closed', 'entries']), [
        'receiptDate',
      ]),
      ...(receiptNumber ? { receiptNumber } : {}),
      // Avoid rewrite the deliver date in edit mode when already published.
      ...(saleReceiptDTO.closed &&
        !oldSaleReceipt?.closedAt && {
          closedAt: moment().toMySqlDateTime(),
        }),
      entries: saleReceiptDTO.entries.map((entry) => ({
        reference_type: 'SaleReceipt',
        ...omit(entry, ['id', 'amount']),
      })),
    };
  }

  /**
   * Creates a new sale receipt with associated entries.
   * @async
   * @param {ISaleReceipt} saleReceipt
   * @return {Object}
   */
  public async createSaleReceipt(
    tenantId: number,
    saleReceiptDTO: any
  ): Promise<ISaleReceipt> {
    const { SaleReceipt } = this.tenancy.models(tenantId);

    // Transform sale receipt DTO to model.
    const saleReceiptObj = this.transformObjectDTOToModel(
      tenantId,
      saleReceiptDTO
    );
    // Validate receipt number is required.
    this.validateReceiptNoRequire(saleReceiptObj);

    // Validate receipt deposit account existance and type.
    await this.validateReceiptDepositAccountExistance(
      tenantId,
      saleReceiptDTO.depositAccountId
    );
    // Validate items IDs existance on the storage.
    await this.itemsEntriesService.validateItemsIdsExistance(
      tenantId,
      saleReceiptDTO.entries
    );
    // Validate the sellable items.
    await this.itemsEntriesService.validateNonSellableEntriesItems(
      tenantId,
      saleReceiptDTO.entries
    );
    // Validate sale receipt number uniuqiness.
    if (saleReceiptDTO.receiptNumber) {
      await this.validateReceiptNumberUnique(
        tenantId,
        saleReceiptDTO.receiptNumber
      );
    }
    this.logger.info('[sale_receipt] trying to insert sale receipt graph.', {
      tenantId,
      saleReceiptDTO,
    });
    const saleReceipt = await SaleReceipt.query().upsertGraph({
      ...saleReceiptObj,
    });
    // Triggers `onSaleReceiptCreated` event.
    await this.eventDispatcher.dispatch(events.saleReceipt.onCreated, {
      tenantId,
      saleReceipt,
      saleReceiptId: saleReceipt.id,
    });
    this.logger.info('[sale_receipt] sale receipt inserted successfully.', {
      tenantId,
    });

    return saleReceipt;
  }

  /**
   * Edit details sale receipt with associated entries.
   * @param {Integer} saleReceiptId
   * @param {ISaleReceipt} saleReceipt
   * @return {void}
   */
  public async editSaleReceipt(
    tenantId: number,
    saleReceiptId: number,
    saleReceiptDTO: any
  ) {
    const { SaleReceipt } = this.tenancy.models(tenantId);

    // Retrieve sale receipt or throw not found service error.
    const oldSaleReceipt = await this.getSaleReceiptOrThrowError(
      tenantId,
      saleReceiptId
    );
    // Transform sale receipt DTO to model.
    const saleReceiptObj = this.transformObjectDTOToModel(
      tenantId,
      saleReceiptDTO,
      oldSaleReceipt
    );
    // Validate receipt number is required.
    this.validateReceiptNoRequire(saleReceiptObj);

    // Validate receipt deposit account existance and type.
    await this.validateReceiptDepositAccountExistance(
      tenantId,
      saleReceiptDTO.depositAccountId
    );
    // Validate items IDs existance on the storage.
    await this.itemsEntriesService.validateItemsIdsExistance(
      tenantId,
      saleReceiptDTO.entries
    );
    // Validate the sellable items.
    await this.itemsEntriesService.validateNonSellableEntriesItems(
      tenantId,
      saleReceiptDTO.entries
    );
    // Validate sale receipt number uniuqiness.
    if (saleReceiptDTO.receiptNumber) {
      await this.validateReceiptNumberUnique(
        tenantId,
        saleReceiptDTO.receiptNumber,
        saleReceiptId
      );
    }
    const saleReceipt = await SaleReceipt.query().upsertGraphAndFetch({
      id: saleReceiptId,
      ...saleReceiptObj,
    });

    this.logger.info('[sale_receipt] edited successfully.', {
      tenantId,
      saleReceiptId,
    });
    // Triggers `onSaleReceiptEdited` event.
    await this.eventDispatcher.dispatch(events.saleReceipt.onEdited, {
      tenantId,
      oldSaleReceipt,
      saleReceipt,
      saleReceiptId,
    });
    return saleReceipt;
  }

  /**
   * Deletes the sale receipt with associated entries.
   * @param {Integer} saleReceiptId
   * @return {void}
   */
  public async deleteSaleReceipt(tenantId: number, saleReceiptId: number) {
    const { SaleReceipt, ItemEntry } = this.tenancy.models(tenantId);

    const oldSaleReceipt = await this.getSaleReceiptOrThrowError(
      tenantId,
      saleReceiptId
    );
    await ItemEntry.query()
      .where('reference_id', saleReceiptId)
      .where('reference_type', 'SaleReceipt')
      .delete();

    await SaleReceipt.query().where('id', saleReceiptId).delete();

    this.logger.info('[sale_receipt] deleted successfully.', {
      tenantId,
      saleReceiptId,
    });
    await this.eventDispatcher.dispatch(events.saleReceipt.onDeleted, {
      tenantId,
      saleReceiptId,
      oldSaleReceipt,
    });
  }

  /**
   * Retrieve sale receipt with associated entries.
   * @param {Integer} saleReceiptId
   * @return {ISaleReceipt}
   */
  async getSaleReceipt(tenantId: number, saleReceiptId: number) {
    const { SaleReceipt } = this.tenancy.models(tenantId);

    const saleReceipt = await SaleReceipt.query()
      .findById(saleReceiptId)
      .withGraphFetched('entries')
      .withGraphFetched('customer')
      .withGraphFetched('depositAccount');

    if (!saleReceipt) {
      throw new ServiceError(ERRORS.SALE_RECEIPT_NOT_FOUND);
    }
    return saleReceipt;
  }

  /**
   * Retrieve sales receipts paginated and filterable list.
   * @param {number} tenantId
   * @param {ISaleReceiptFilter} salesReceiptsFilter
   */
  public async salesReceiptsList(
    tenantId: number,
    salesReceiptsFilter: ISaleReceiptFilter
  ): Promise<{
    salesReceipts: ISaleReceipt[];
    pagination: IPaginationMeta;
    filterMeta: IFilterMeta;
  }> {
    const { SaleReceipt } = this.tenancy.models(tenantId);
    const dynamicFilter = await this.dynamicListService.dynamicList(
      tenantId,
      SaleReceipt,
      salesReceiptsFilter
    );

    this.logger.info('[sale_receipt] try to get sales receipts list.', {
      tenantId,
    });
    const { results, pagination } = await SaleReceipt.query()
      .onBuild((builder) => {
        builder.withGraphFetched('depositAccount');
        builder.withGraphFetched('customer');
        builder.withGraphFetched('entries');

        dynamicFilter.buildQuery()(builder);
      })
      .pagination(salesReceiptsFilter.page - 1, salesReceiptsFilter.pageSize);

    return {
      salesReceipts: results,
      pagination,
      filterMeta: dynamicFilter.getResponseMeta(),
    };
  }

  /**
   * Mark the given sale receipt as closed.
   * @param {number} tenantId
   * @param {number} saleReceiptId
   * @return {Promise<void>}
   */
  async closeSaleReceipt(
    tenantId: number,
    saleReceiptId: number
  ): Promise<void> {
    const { SaleReceipt } = this.tenancy.models(tenantId);

    // Retrieve sale receipt or throw not found service error.
    const oldSaleReceipt = await this.getSaleReceiptOrThrowError(
      tenantId,
      saleReceiptId
    );

    // Throw service error if the sale receipt already closed.
    if (oldSaleReceipt.isClosed) {
      throw new ServiceError(ERRORS.SALE_RECEIPT_IS_ALREADY_CLOSED);
    }
    // Mark the sale receipt as closed on the storage.
    await SaleReceipt.query().findById(saleReceiptId).patch({
      closedAt: moment().toMySqlDateTime(),
    });
  }

  /**
   * Writes the sale invoice income journal entries.
   * @param {number} tenantId - Tenant id.
   * @param {ISaleInvoice} saleInvoice - Sale invoice id.
   */
  public async writesIncomeJournalEntries(
    tenantId: number,
    saleInvoice: ISaleReceipt & {
      entries: IItemEntry & { item: IItem };
    },
    override: boolean = false
  ): Promise<void> {
    const journal = new JournalPoster(tenantId);
    const journalCommands = new JournalCommands(journal);

    if (override) {
      await journalCommands.revertJournalEntries(saleInvoice.id, 'SaleReceipt');
    }
    // Records the sale invoice journal entries.
    await journalCommands.saleReceiptIncomeEntries(saleInvoice);

    await Promise.all([
      journal.deleteEntries(),
      journal.saveBalance(),
      journal.saveEntries(),
    ]);
  }

  /**
   * Reverting the sale receipt journal entries.
   * @param {number} tenantId
   * @param {number} saleReceiptId
   * @return {Promise<void>}
   */
  public async revertReceiptJournalEntries(
    tenantId: number,
    saleReceiptId: number | number[]
  ): Promise<void> {
    return this.journalService.revertJournalTransactions(
      tenantId,
      saleReceiptId,
      'SaleReceipt'
    );
  }

  /**
   * Records the inventory transactions from the given bill input.
   * @param {Bill} bill - Bill model object.
   * @param {number} billId - Bill id.
   * @return {Promise<void>}
   */
  public async recordInventoryTransactions(
    tenantId: number,
    saleReceipt: ISaleReceipt,
    override?: boolean
  ): Promise<void> {
    return this.inventoryService.recordInventoryTransactionsFromItemsEntries(
      tenantId,
      saleReceipt.id,
      'SaleReceipt',
      saleReceipt.receiptDate,
      'OUT',
      override
    );
  }

  /**
   * Reverts the inventory transactions of the given bill id.
   * @param {number} tenantId - Tenant id.
   * @param {number} billId - Bill id.
   * @return {Promise<void>}
   */
  public async revertInventoryTransactions(
    tenantId: number,
    receiptId: number
  ) {
    return this.inventoryService.deleteInventoryTransactions(
      tenantId,
      receiptId,
      'SaleReceipt'
    );
  }
}
