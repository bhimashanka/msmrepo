const express = require('express');
const router = express.Router();
const { allAsync, getAsync } = require('../db');
const { authenticateUser, scopeBaseAccess } = require('../middleware/auth');

// Dynamic metrics endpoint
router.get('/metrics', authenticateUser, scopeBaseAccess, async (req, res) => {
  try {
    const { base_id, equipment_id, start_date, end_date } = req.query;

    // Apply base scoping if Base Commander
    const effectiveBaseId = req.user.role === 'base_commander' ? req.user.base_id : base_id;

    // Base query conditions
    let inventoryWhere = [];
    let inventoryParams = [];

    let purchasesWhere = [];
    let purchasesParams = [];

    let transfersInWhere = ["status = 'Completed'"];
    let transfersInParams = [];

    let transfersOutWhere = ["status IN ('Completed', 'In-Transit')"];
    let transfersOutParams = [];

    let assignmentsWhere = ["status = 'Active'"];
    let assignmentsParams = [];

    let expendituresWhere = [];
    let expendituresParams = [];

    // Base Filter
    if (effectiveBaseId && effectiveBaseId !== 'all') {
      inventoryWhere.push('base_id = ?');
      inventoryParams.push(effectiveBaseId);

      purchasesWhere.push('base_id = ?');
      purchasesParams.push(effectiveBaseId);

      transfersInWhere.push('dest_base_id = ?');
      transfersInParams.push(effectiveBaseId);

      transfersOutWhere.push('source_base_id = ?');
      transfersOutParams.push(effectiveBaseId);

      assignmentsWhere.push('base_id = ?');
      assignmentsParams.push(effectiveBaseId);

      expendituresWhere.push('base_id = ?');
      expendituresParams.push(effectiveBaseId);
    }

    // Equipment Filter
    if (equipment_id && equipment_id !== 'all') {
      inventoryWhere.push('equipment_id = ?');
      inventoryParams.push(equipment_id);

      purchasesWhere.push('equipment_id = ?');
      purchasesParams.push(equipment_id);

      transfersInWhere.push('equipment_id = ?');
      transfersInParams.push(equipment_id);

      transfersOutWhere.push('equipment_id = ?');
      transfersOutParams.push(equipment_id);

      assignmentsWhere.push('equipment_id = ?');
      assignmentsParams.push(equipment_id);

      expendituresWhere.push('equipment_id = ?');
      expendituresParams.push(equipment_id);
    }

    // Date Filters
    if (start_date) {
      purchasesWhere.push('purchase_date >= ?');
      purchasesParams.push(start_date);

      transfersInWhere.push('transfer_date >= ?');
      transfersInParams.push(start_date);

      transfersOutWhere.push('transfer_date >= ?');
      transfersOutParams.push(start_date);

      assignmentsWhere.push('assignment_date >= ?');
      assignmentsParams.push(start_date);

      expendituresWhere.push('expenditure_date >= ?');
      expendituresParams.push(start_date);
    }

    if (end_date) {
      purchasesWhere.push('purchase_date <= ?');
      purchasesParams.push(end_date);

      transfersInWhere.push('transfer_date <= ?');
      transfersInParams.push(end_date);

      transfersOutWhere.push('transfer_date <= ?');
      transfersOutParams.push(end_date);

      assignmentsWhere.push('assignment_date <= ?');
      assignmentsParams.push(end_date);

      expendituresWhere.push('expenditure_date <= ?');
      expendituresParams.push(end_date);
    }

    // 1. Opening Balance Total
    const invSql = `SELECT COALESCE(SUM(opening_balance), 0) as total_opening, COALESCE(SUM(current_stock), 0) as total_current FROM inventory ${inventoryWhere.length ? 'WHERE ' + inventoryWhere.join(' AND ') : ''}`;
    const invRes = await getAsync(invSql, inventoryParams);

    // 2. Purchases Total
    const purSql = `SELECT COALESCE(SUM(quantity), 0) as total_purchases, COALESCE(SUM(total_cost), 0) as total_purchase_cost FROM purchases ${purchasesWhere.length ? 'WHERE ' + purchasesWhere.join(' AND ') : ''}`;
    const purRes = await getAsync(purSql, purchasesParams);

    // 3. Transfers In Total
    const trInSql = `SELECT COALESCE(SUM(quantity), 0) as total_transfers_in FROM transfers ${transfersInWhere.length ? 'WHERE ' + transfersInWhere.join(' AND ') : ''}`;
    const trInRes = await getAsync(trInSql, transfersInParams);

    // 4. Transfers Out Total
    const trOutSql = `SELECT COALESCE(SUM(quantity), 0) as total_transfers_out FROM transfers ${transfersOutWhere.length ? 'WHERE ' + transfersOutWhere.join(' AND ') : ''}`;
    const trOutRes = await getAsync(trOutSql, transfersOutParams);

    // 5. Active Assignments Total
    const asgnSql = `SELECT COALESCE(SUM(quantity), 0) as total_assigned FROM assignments ${assignmentsWhere.length ? 'WHERE ' + assignmentsWhere.join(' AND ') : ''}`;
    const asgnRes = await getAsync(asgnSql, assignmentsParams);

    // 6. Expended Total
    const expSql = `SELECT COALESCE(SUM(quantity), 0) as total_expended FROM expenditures ${expendituresWhere.length ? 'WHERE ' + expendituresWhere.join(' AND ') : ''}`;
    const expRes = await getAsync(expSql, expendituresParams);

    const openingBalance = invRes ? invRes.total_opening : 0;
    const purchases = purRes ? purRes.total_purchases : 0;
    const purchaseCost = purRes ? purRes.total_purchase_cost : 0;
    const transfersIn = trInRes ? trInRes.total_transfers_in : 0;
    const transfersOut = trOutRes ? trOutRes.total_transfers_out : 0;
    const assigned = asgnRes ? asgnRes.total_assigned : 0;
    const expended = expRes ? expRes.total_expended : 0;

    const netMovement = purchases + transfersIn - transfersOut;
    const closingBalance = openingBalance + netMovement - expended;

    // Get breakdown by Equipment Category for analytics chart
    const categoryBreakdown = await allAsync(`
      SELECT e.category, COALESCE(SUM(i.current_stock), 0) as stock_count
      FROM inventory i
      JOIN equipment_types e ON i.equipment_id = e.id
      ${effectiveBaseId && effectiveBaseId !== 'all' ? 'WHERE i.base_id = ' + parseInt(effectiveBaseId) : ''}
      GROUP BY e.category
    `);

    res.json({
      openingBalance,
      purchases,
      purchaseCost,
      transfersIn,
      transfersOut,
      netMovement,
      assigned,
      expended,
      closingBalance,
      categoryBreakdown
    });
  } catch (err) {
    console.error('Dashboard metrics error:', err);
    res.status(500).json({ error: 'Failed to calculate metrics', details: err.message });
  }
});

// Net Movement drill-down pop-up endpoint
router.get('/net-movement-details', authenticateUser, scopeBaseAccess, async (req, res) => {
  try {
    const { base_id, equipment_id, start_date, end_date } = req.query;
    const effectiveBaseId = req.user.role === 'base_commander' ? req.user.base_id : base_id;

    // Purchases breakdown
    let pWhere = [];
    let pParams = [];
    if (effectiveBaseId && effectiveBaseId !== 'all') { pWhere.push('p.base_id = ?'); pParams.push(effectiveBaseId); }
    if (equipment_id && equipment_id !== 'all') { pWhere.push('p.equipment_id = ?'); pParams.push(equipment_id); }
    if (start_date) { pWhere.push('p.purchase_date >= ?'); pParams.push(start_date); }
    if (end_date) { pWhere.push('p.purchase_date <= ?'); pParams.push(end_date); }

    const purchasesList = await allAsync(`
      SELECT p.*, b.name as base_name, e.name as equipment_name, e.category as equipment_category
      FROM purchases p
      JOIN bases b ON p.base_id = b.id
      JOIN equipment_types e ON p.equipment_id = e.id
      ${pWhere.length ? 'WHERE ' + pWhere.join(' AND ') : ''}
      ORDER BY p.purchase_date DESC
    `, pParams);

    // Transfers In breakdown
    let tinWhere = [];
    let tinParams = [];
    if (effectiveBaseId && effectiveBaseId !== 'all') { tinWhere.push('t.dest_base_id = ?'); tinParams.push(effectiveBaseId); }
    if (equipment_id && equipment_id !== 'all') { tinWhere.push('t.equipment_id = ?'); tinParams.push(equipment_id); }
    if (start_date) { tinWhere.push('t.transfer_date >= ?'); tinParams.push(start_date); }
    if (end_date) { tinWhere.push('t.transfer_date <= ?'); tinParams.push(end_date); }

    const transfersInList = await allAsync(`
      SELECT t.*, sb.name as source_base_name, db.name as dest_base_name, e.name as equipment_name
      FROM transfers t
      JOIN bases sb ON t.source_base_id = sb.id
      JOIN bases db ON t.dest_base_id = db.id
      JOIN equipment_types e ON t.equipment_id = e.id
      ${tinWhere.length ? 'WHERE ' + tinWhere.join(' AND ') : ''}
      ORDER BY t.transfer_date DESC
    `, tinParams);

    // Transfers Out breakdown
    let toutWhere = [];
    let toutParams = [];
    if (effectiveBaseId && effectiveBaseId !== 'all') { toutWhere.push('t.source_base_id = ?'); toutParams.push(effectiveBaseId); }
    if (equipment_id && equipment_id !== 'all') { toutWhere.push('t.equipment_id = ?'); toutParams.push(equipment_id); }
    if (start_date) { toutWhere.push('t.transfer_date >= ?'); toutParams.push(start_date); }
    if (end_date) { toutWhere.push('t.transfer_date <= ?'); toutParams.push(end_date); }

    const transfersOutList = await allAsync(`
      SELECT t.*, sb.name as source_base_name, db.name as dest_base_name, e.name as equipment_name
      FROM transfers t
      JOIN bases sb ON t.source_base_id = sb.id
      JOIN bases db ON t.dest_base_id = db.id
      JOIN equipment_types e ON t.equipment_id = e.id
      ${toutWhere.length ? 'WHERE ' + toutWhere.join(' AND ') : ''}
      ORDER BY t.transfer_date DESC
    `, toutParams);

    res.json({
      purchases: purchasesList,
      transfersIn: transfersInList,
      transfersOut: transfersOutList
    });
  } catch (err) {
    console.error('Net movement details error:', err);
    res.status(500).json({ error: 'Failed to fetch net movement details', details: err.message });
  }
});

module.exports = router;
