import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["tableSelect", "tableData"]

  connect() {
    this.loadTables()
  }

  async loadTables() {
    try {
      const res = await fetch("/api/admin/database/tables", { credentials: "same-origin" })
      if (!res.ok) return
      const json = await res.json()
      const tables = json.data || json.tables || []

      if (this.hasTableSelectTarget) {
        tables.forEach(t => {
          const opt = document.createElement("option")
          opt.value = typeof t === "string" ? t : t.name
          opt.textContent = typeof t === "string" ? t : `${t.name} (${t.row_count} rows)`
          this.tableSelectTarget.appendChild(opt)
        })
      }
    } catch (e) {
      console.error("Failed to load tables:", e)
    }
  }

  async loadTable() {
    const table = this.tableSelectTarget.value
    if (!table) return

    if (this.hasTableDataTarget) {
      this.tableDataTarget.textContent = "Loading..."
      this.tableDataTarget.className = "p-8 text-center text-zinc-400 dark:text-zinc-500 text-sm"
    }

    try {
      const res = await fetch(`/api/admin/database/${encodeURIComponent(table)}?limit=50`, { credentials: "same-origin" })
      if (!res.ok) {
        this.tableDataTarget.textContent = "Failed to load table data"
        return
      }
      const json = await res.json()
      this.renderTable(json.data || json)
    } catch (e) {
      console.error("Failed to load table:", e)
      if (this.hasTableDataTarget) this.tableDataTarget.textContent = "Error loading table"
    }
  }

  renderTable(data) {
    if (!this.hasTableDataTarget) return
    this.tableDataTarget.textContent = ""
    this.tableDataTarget.className = ""

    const rows = data.rows || []
    const columns = data.columns || []

    if (rows.length === 0) {
      this.tableDataTarget.className = "p-8 text-center text-zinc-400 dark:text-zinc-500 text-sm"
      this.tableDataTarget.textContent = "Table is empty"
      return
    }

    const table = document.createElement("table")
    table.className = "w-full text-sm"

    // Header
    const thead = document.createElement("thead")
    thead.className = "bg-zinc-50 dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700"
    const headerRow = document.createElement("tr")
    const colNames = columns.length > 0 ? columns.map(c => c.name) : Object.keys(rows[0])
    colNames.forEach(col => {
      const th = document.createElement("th")
      th.className = "text-left px-3 py-2 text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase whitespace-nowrap"
      th.textContent = col
      headerRow.appendChild(th)
    })
    thead.appendChild(headerRow)
    table.appendChild(thead)

    // Body
    const tbody = document.createElement("tbody")
    tbody.className = "divide-y divide-zinc-100 dark:divide-zinc-800"
    rows.forEach(row => {
      const tr = document.createElement("tr")
      tr.className = "hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
      colNames.forEach(col => {
        const td = document.createElement("td")
        td.className = "px-3 py-2 text-zinc-700 dark:text-zinc-300 whitespace-nowrap max-w-[200px] truncate"
        const val = row[col]
        td.textContent = val === null ? "NULL" : String(val)
        if (val === null) td.className += " italic text-zinc-400"
        tr.appendChild(td)
      })
      tbody.appendChild(tr)
    })
    table.appendChild(tbody)

    this.tableDataTarget.appendChild(table)

    // Row count
    const info = document.createElement("div")
    info.className = "p-3 text-xs text-zinc-400 dark:text-zinc-500 border-t border-zinc-200 dark:border-zinc-800"
    info.textContent = `Showing ${rows.length} rows`
    this.tableDataTarget.appendChild(info)
  }
}
