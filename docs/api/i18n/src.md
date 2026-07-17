[**e-logistic**](../index.md)

***

[e-logistic](../api/index.md) / i18n/src

# i18n/src

## Type Aliases

### Locale

> **Locale** = *typeof* [`LOCALES`](../api/i18n/src.md#locales)\[`number`\]

Defined in: [i18n/src/index.ts:11](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/i18n/src/index.ts#L11)

***

### MessageKey

> **MessageKey** = keyof *typeof* `pl`

Defined in: [i18n/src/locales/pl.ts:331](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/i18n/src/locales/pl.ts#L331)

***

### MobileLocale

> **MobileLocale** = *typeof* [`MOBILE_LOCALES`](../api/i18n/src.md#mobile_locales)\[`number`\]

Defined in: [i18n/src/mobile.ts:3324](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/i18n/src/mobile.ts#L3324)

***

### MobileMessageKey

> **MobileMessageKey** = keyof *typeof* `pl`

Defined in: [i18n/src/mobile.ts:840](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/i18n/src/mobile.ts#L840)

## Variables

### DEFAULT\_LOCALE

> `const` **DEFAULT\_LOCALE**: [`Locale`](../api/i18n/src.md#locale) = `"pl"`

Defined in: [i18n/src/index.ts:12](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/i18n/src/index.ts#L12)

***

### DEFAULT\_MOBILE\_LOCALE

> `const` **DEFAULT\_MOBILE\_LOCALE**: [`MobileLocale`](../api/i18n/src.md#mobilelocale) = `"pl"`

Defined in: [i18n/src/mobile.ts:3325](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/i18n/src/mobile.ts#L3325)

***

### LOCALES

> `const` **LOCALES**: readonly \[`"pl"`, `"en"`\]

Defined in: [i18n/src/index.ts:10](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/i18n/src/index.ts#L10)

***

### messages

> `const` **messages**: `Record`\<[`Locale`](../api/i18n/src.md#locale), `Record`\<[`MessageKey`](../api/i18n/src.md#messagekey), `string`\>\>

Defined in: [i18n/src/index.ts:14](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/i18n/src/index.ts#L14)

***

### MOBILE\_LOCALES

> `const` **MOBILE\_LOCALES**: readonly \[`"pl"`, `"en"`, `"de"`, `"uk"`\]

Defined in: [i18n/src/mobile.ts:3323](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/i18n/src/mobile.ts#L3323)

***

### mobileMessages

> `const` **mobileMessages**: `Record`\<[`MobileLocale`](../api/i18n/src.md#mobilelocale), `Record`\<[`MobileMessageKey`](../api/i18n/src.md#mobilemessagekey), `string`\>\>

Defined in: [i18n/src/mobile.ts:3327](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/i18n/src/mobile.ts#L3327)

## Functions

### createTranslator()

> **createTranslator**(`locale`): (`key`) => `string`

Defined in: [i18n/src/index.ts:22](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/i18n/src/index.ts#L22)

Zwraca funkcję tłumaczącą związaną z językiem.

#### Parameters

##### locale

`"pl"` \| `"en"`

#### Returns

(`key`) => `string`

***

### t()

> **t**(`locale`, `key`): `string`

Defined in: [i18n/src/index.ts:17](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/i18n/src/index.ts#L17)

Tłumaczy klucz na dany język (fallback: język domyślny).

#### Parameters

##### locale

`"pl"` \| `"en"`

##### key

`"app.name"` \| `"app.tagline"` \| `"settings.danger.title"` \| `"settings.danger.desc"` \| `"settings.danger.confirmLabel"` \| `"settings.danger.button"` \| `"settings.danger.working"` \| `"settings.danger.success"` \| `"settings.danger.mismatch"` \| `"mobileMap.locate"` \| `"mobileMap.poiLoad"` \| `"mobileMap.poiFuel"` \| `"mobileMap.poiParking"` \| `"mobileMap.permissionDenied"` \| `"mobileMap.poiError"` \| `"mobileMap.searchPlaceholder"` \| `"mobileMap.searchError"` \| `"mobileMap.searchTooShort"` \| `"mobileMap.noResults"` \| `"mobileMap.routeError"` \| `"mobileMap.planRoute"` \| `"mobileMap.planning"` \| `"mobileMap.alongFuel"` \| `"mobileMap.alongParking"` \| `"mobileMap.alongEmpty"` \| `"mobileMap.trafficShow"` \| `"mobileMap.trafficHide"` \| `"mobileMap.trafficZoomIn"` \| `"mobileMap.trafficError"` \| `"mobileMap.trafficNone"` \| `"mobileMap.incidentClosure"` \| `"mobileMap.nearbyFuel"` \| `"mobileMap.nearbyParking"` \| `"mobileMap.nearbyBusy"` \| `"role.developer"` \| `"role.owner"` \| `"role.dispatcher"` \| `"role.driver"` \| `"nav.dashboard"` \| `"nav.vehicles"` \| `"nav.drivers"` \| `"nav.cards"` \| `"nav.map"` \| `"nav.stats"` \| `"nav.journeys"` \| `"nav.settlements"` \| `"nav.checklists"` \| `"nav.reports"` \| `"nav.settings"` \| `"nav.orders"` \| `"nav.fleetStatus"` \| `"nav.myOrders"` \| `"nav.service"` \| `"nav.damages"` \| `"nav.costs"` \| `"nav.documents"` \| `"nav.invoices"` \| `"nav.contractors"` \| `"nav.monthly"` \| `"nav.perDiem"` \| `"nav.analytics"` \| `"nav.tacho"` \| `"nav.workTime"` \| `"nav.chat"` \| `"nav.expenses"` \| `"nav.schedule"` \| `"nav.scoring"` \| `"nav.payouts"` \| `"nav.fuelPrices"` \| `"nav.team"` \| `"nav.audit"` \| `"nav.dev"` \| `"theme.toggle"` \| `"theme.light"` \| `"theme.dark"` \| `"cmd.nav"` \| `"cmd.action"` \| `"cmd.theme"` \| `"cmd.print"` \| `"table.filter"` \| `"table.empty"` \| `"nav.group.orders"` \| `"nav.group.forms"` \| `"nav.group.fleet"` \| `"nav.group.finance"` \| `"nav.group.pinned"` \| `"nav.pin"` \| `"nav.unpin"` \| `"dashboard.customize"` \| `"dashboard.customize.title"` \| `"dashboard.sec.kpi"` \| `"dashboard.sec.trend"` \| `"dashboard.sec.onboarding"` \| `"dashboard.sec.attention"` \| `"dashboard.sec.shortcuts"` \| `"dashboard.title"` \| `"dashboard.subtitle"` \| `"dashboard.tag.form"` \| `"dashboard.tag.map"` \| `"dashboard.tag.report"` \| `"dashboard.card.fuel.title"` \| `"dashboard.card.fuel.desc"` \| `"dashboard.card.adblue.title"` \| `"dashboard.card.adblue.desc"` \| `"dashboard.card.trip.title"` \| `"dashboard.card.trip.desc"` \| `"dashboard.card.map.title"` \| `"dashboard.card.map.desc"` \| `"dashboard.card.stats.title"` \| `"dashboard.card.stats.desc"` \| `"search.trigger"` \| `"search.aria"` \| `"search.closeAria"` \| `"search.placeholder"` \| `"search.loading"` \| `"search.empty"` \| `"search.start"` \| `"search.type.vehicle"` \| `"search.type.driver"` \| `"search.type.order"` \| `"search.type.invoice"` \| `"auth.signIn"` \| `"auth.signUp"` \| `"auth.createAccount"` \| `"auth.signOut"` \| `"auth.email"` \| `"auth.password"` \| `"auth.magicLink"` \| `"auth.continueGoogle"` \| `"auth.continueApple"` \| `"auth.continueMicrosoft"` \| `"auth.toSignUp"` \| `"auth.toSignIn"` \| `"auth.signInSub"` \| `"auth.signUpSub"` \| `"auth.checkEmail"` \| `"auth.forgotPassword"` \| `"auth.resetSent"` \| `"auth.newPassword"` \| `"auth.setNewPassword"` \| `"auth.passwordChanged"` \| `"auth.twoFactor"` \| `"auth.twoFactorCode"` \| `"auth.twoFactorVerify"` \| `"auth.passkey"` \| `"auth.passkeyAdd"` \| `"auth.passkeyLogin"` \| `"auth.passkeyNone"` \| `"form.fuel.title"` \| `"form.adblue.title"` \| `"form.trip.title"` \| `"form.field.vehicle"` \| `"form.field.odometer"` \| `"form.field.city"` \| `"form.field.fromReg"` \| `"form.field.toReg"` \| `"form.field.liters"` \| `"form.field.country"` \| `"form.field.postcode"` \| `"form.field.company"` \| `"form.field.companyPlaceholder"` \| `"form.geo.fill"` \| `"form.geo.filling"` \| `"form.geo.filled"` \| `"form.geo.denied"` \| `"form.field.location"` \| `"form.field.weight"` \| `"form.field.amount"` \| `"form.field.comment"` \| `"form.field.paymentMethod"` \| `"form.payment.card"` \| `"form.payment.cash"` \| `"trip.action.load"` \| `"trip.action.transshipment"` \| `"trip.action.unload"` \| `"trip.action.start"` \| `"trip.action.end"` \| `"trip.action.service"` \| `"trip.action.other"` \| `"order.status.new"` \| `"order.status.assigned"` \| `"order.status.in_progress"` \| `"order.status.delivered"` \| `"order.status.invoiced"` \| `"order.status.cancelled"` \| `"fleet.state.driving"` \| `"fleet.state.planned"` \| `"fleet.state.idle"` \| `"settings.subtitle"` \| `"settings.company.title"` \| `"settings.company.name"` \| `"settings.company.taxId"` \| `"settings.company.address"` \| `"settings.company.country"` \| `"settings.company.vat"` \| `"settings.company.dueDays"` \| `"settings.company.notifyDays"` \| `"settings.company.bank"` \| `"settings.company.account"` \| `"settings.company.save"` \| `"settings.company.nameRequired"` \| `"settings.company.saved"` \| `"settings.company.saveError"` \| `"settings.company.ownerOnly"` \| `"settings.twofa.enable"` \| `"settings.twofa.disable"` \| `"settings.twofa.scan"` \| `"settings.twofa.manual"` \| `"settings.twofa.qrAlt"` \| `"settings.twofa.enabled"` \| `"settings.twofa.disabledMsg"` \| `"settings.twofa.disableConfirm"` \| `"settings.twofa.startError"` \| `"settings.passkey.desc"` \| `"settings.passkey.namePrompt"` \| `"settings.passkey.defaultName"` \| `"settings.passkey.reauth"` \| `"settings.passkey.addError"` \| `"settings.passkey.added"` \| `"settings.passkey.error"` \| `"settings.passkey.removeConfirm"` \| `"settings.passkey.removeError"` \| `"settings.passkey.unnamed"` \| `"history.subtitle"` \| `"history.source.db"` \| `"history.source.local"` \| `"history.empty"` \| `"history.noResults"` \| `"history.allVehicles"` \| `"history.kind.fuel"` \| `"history.kind.adblue"` \| `"history.kind.trip"` \| `"history.csv.type"` \| `"history.csv.desc"` \| `"history.csv.details"` \| `"orders.csv.number"` \| `"orders.csv.shipper"` \| `"orders.csv.consignee"` \| `"orders.csv.from"` \| `"orders.csv.to"` \| `"orders.csv.cargo"` \| `"orders.csv.weight"` \| `"orders.csv.rate"` \| `"orders.csv.currency"` \| `"orders.csv.loadDate"` \| `"orders.csv.unloadDate"` \| `"invoices.csv.number"` \| `"invoices.csv.buyer"` \| `"invoices.csv.taxId"` \| `"invoices.csv.net"` \| `"invoices.csv.vat"` \| `"invoices.csv.gross"` \| `"monthly.csv.revenue"` \| `"monthly.csv.fuel"` \| `"monthly.csv.adblue"` \| `"monthly.csv.result"` \| `"profit.title"` \| `"profit.approx"` \| `"profit.total.revenue"` \| `"profit.total.cost"` \| `"profit.total.profit"` \| `"profit.col.client"` \| `"profit.col.ordersShort"` \| `"profit.col.orders"` \| `"profit.col.revenue"` \| `"profit.col.cost"` \| `"profit.col.profit"` \| `"profit.col.margin"` \| `"profit.col.month"` \| `"profit.trend.title"` \| `"alerts.title"` \| `"alerts.negativeMargin"` \| `"alerts.lowMargin"` \| `"alerts.fuelAnomaly"` \| `"alerts.fuelSpike"` \| `"profit.note"` \| `"profit.unattributed"` \| `"profit.noVehicle"` \| `"sync.draft"` \| `"sync.queued"` \| `"sync.synced"` \| `"sync.error"` \| `"sync.offline"` \| `"common.save"` \| `"common.cancel"` \| `"common.edit"` \| `"common.delete"` \| `"common.history"` \| `"common.language"` \| `"common.noNumber"` \| `"common.all"` \| `"common.active"` \| `"common.disabled"` \| `"common.loading"` \| `"common.saving"` \| `"common.error"` \| `"common.retry"` \| `"common.status"` \| `"common.vehicle"` \| `"common.date"` \| `"common.total"`

#### Returns

`string`

***

### tMobile()

> **tMobile**(`locale`, `key`, `params?`): `string`

Defined in: [i18n/src/mobile.ts:3335](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/i18n/src/mobile.ts#L3335)

Tłumaczy klucz mobilny; `params` podmienia `{nazwa}` w treści.

#### Parameters

##### locale

`"pl"` \| `"en"` \| `"de"` \| `"uk"`

##### key

`"m.tab.home"` \| `"m.tab.orders"` \| `"m.tab.map"` \| `"m.tab.more"` \| `"m.screen.login"` \| `"m.screen.fuel"` \| `"m.screen.adblue"` \| `"m.screen.trip"` \| `"m.screen.checklists"` \| `"m.screen.documents"` \| `"m.screen.chat"` \| `"m.screen.chatThread"` \| `"m.screen.expenses"` \| `"m.screen.workTime"` \| `"m.screen.settlement"` \| `"m.screen.vehicle"` \| `"m.screen.defects"` \| `"m.screen.stats"` \| `"m.screen.settings"` \| `"m.home.hello"` \| `"m.home.driverFallback"` \| `"m.home.currentOrder"` \| `"m.home.navigate"` \| `"m.home.details"` \| `"m.home.orderDetailsIn"` \| `"m.home.noOrder"` \| `"m.home.startTrip"` \| `"m.home.fuelAction"` \| `"m.home.checklistAction"` \| `"m.home.today"` \| `"m.home.fuelToday"` \| `"m.home.checklists"` \| `"m.home.sync"` \| `"m.home.activities"` \| `"m.home.activitiesEmpty"` \| `"m.kind.fuel"` \| `"m.kind.adblue"` \| `"m.kind.trip"` \| `"m.kind.checklist"` \| `"m.kind.expense"` \| `"m.fab.defect"` \| `"m.offline.pending"` \| `"m.offline.sending"` \| `"m.settings.language"` \| `"m.settings.languageAuto"` \| `"m.fuel.vehicle"` \| `"m.fuel.repeatLast"` \| `"m.fuel.repeatFirst"` \| `"m.fuel.repeatNone"` \| `"m.fuel.repeatLoaded"` \| `"m.fuel.scan"` \| `"m.fuel.scanOk"` \| `"m.fuel.scanFilled"` \| `"m.fuel.scanFail"` \| `"m.fuel.scanUnavailable"` \| `"m.fuel.liters"` \| `"m.fuel.odometer"` \| `"m.fuel.location"` \| `"m.fuel.country"` \| `"m.fuel.city"` \| `"m.fuel.payment"` \| `"m.fuel.card"` \| `"m.fuel.cash"` \| `"m.fuel.pickVehicle"` \| `"m.fuel.fullFuel"` \| `"m.fuel.fullAdblue"` \| `"m.fuel.viewOnly"` \| `"m.fuel.saving"` \| `"m.fuel.saveFuel"` \| `"m.fuel.saveAdblue"` \| `"m.fuel.savedSynced"` \| `"m.fuel.savedLocal"` \| `"m.fuel.historyFuel"` \| `"m.fuel.historyAdblue"` \| `"m.fuel.syncError"` \| `"m.orders.new"` \| `"m.orders.assigned"` \| `"m.orders.inProgress"` \| `"m.orders.delivered"` \| `"m.orders.invoiced"` \| `"m.orders.cancelled"` \| `"m.profile.title"` \| `"m.profile.save"` \| `"m.profile.error"` \| `"m.profile.avatarDenied"` \| `"m.profile.changeAvatar"` \| `"m.profile.avatarHint"` \| `"m.profile.avatarSaved"` \| `"m.profile.phone"` \| `"m.profile.phoneSaved"` \| `"m.profile.email"` \| `"m.profile.emailHint"` \| `"m.profile.changeEmail"` \| `"m.profile.emailInvalid"` \| `"m.profile.emailSent"` \| `"m.profile.password"` \| `"m.profile.newPassword"` \| `"m.profile.repeatPassword"` \| `"m.profile.changePassword"` \| `"m.profile.passwordShort"` \| `"m.profile.passwordMismatch"` \| `"m.profile.passwordSaved"` \| `"m.owner.onRoute"` \| `"m.owner.idle"` \| `"m.owner.inService"` \| `"m.owner.revenueMonth"` \| `"m.owner.alerts"` \| `"m.owner.noAlerts"` \| `"m.owner.terms"` \| `"m.owner.overdue"` \| `"m.owner.days"` \| `"m.owner.oc"` \| `"m.owner.inspection"` \| `"m.owner.leasing"` \| `"m.owner.card"` \| `"m.owner.license"` \| `"m.nav.start"` \| `"m.nav.forms"` \| `"m.nav.cards"` \| `"m.drawer.work"` \| `"m.drawer.tools"` \| `"m.drawer.account"` \| `"m.drawer.close"` \| `"m.forms.hint"` \| `"m.forms.fuelSub"` \| `"m.forms.adblueSub"` \| `"m.forms.tripSub"` \| `"m.forms.expenseSub"` \| `"m.forms.defectSub"` \| `"m.cards.empty"` \| `"m.cards.loadError"` \| `"m.cards.pinError"` \| `"m.cards.validUntil"` \| `"m.cards.discount"` \| `"m.cards.showPin"` \| `"m.cards.auditNote"` \| `"m.card.tenure"` \| `"m.card.years"` \| `"m.card.months"` \| `"m.journal.title"` \| `"m.journal.workStart"` \| `"m.journal.workEnd"` \| `"m.journal.weeklyStart"` \| `"m.journal.weeklyEnd"` \| `"m.journal.dailyStart"` \| `"m.journal.dailyEnd"` \| `"m.journal.startDay"` \| `"m.journal.endDay"` \| `"m.journal.startWeekly"` \| `"m.journal.endWeekly"` \| `"m.journal.pickType"` \| `"m.journal.regular"` \| `"m.journal.reduced"` \| `"m.journal.cancel"` \| `"m.journal.nextRest"` \| `"m.journal.inHours"` \| `"m.journal.overdue"` \| `"m.journal.history"` \| `"m.journal.hint"` \| `"m.fuel.postcode"` \| `"m.fuel.company"` \| `"m.fuel.geoFill"` \| `"m.fuel.geoFilling"` \| `"m.fuel.geoFilled"` \| `"m.fuel.geoDenied"` \| `"m.geo.fromGps"` \| `"m.geo.filling"` \| `"m.geo.filled"` \| `"m.geo.denied"` \| `"m.geo.error"` \| `"m.screen.manageVehicles"` \| `"m.screen.manageCards"` \| `"m.screen.manageChecklists"` \| `"m.screen.manageContractors"` \| `"m.screen.manageCosts"` \| `"m.screen.manageDrivers"` \| `"m.screen.manageService"` \| `"m.screen.manageTeam"` \| `"m.screen.manageOrders"` \| `"m.screen.manageInvoices"` \| `"m.minv.invoices"` \| `"m.minv.new"` \| `"m.minv.empty"` \| `"m.minv.create"` \| `"m.minv.buyerName"` \| `"m.minv.buyerTaxId"` \| `"m.minv.buyerAddress"` \| `"m.minv.currency"` \| `"m.minv.needBuyer"` \| `"m.minv.status.issued"` \| `"m.minv.status.cancelled"` \| `"m.minv.paid"` \| `"m.minv.unpaid"` \| `"m.minv.gross"` \| `"m.minv.net"` \| `"m.minv.items"` \| `"m.minv.addItem"` \| `"m.minv.itemDesc"` \| `"m.minv.qty"` \| `"m.minv.unitPrice"` \| `"m.minv.vat"` \| `"m.minv.badItem"` \| `"m.minv.markPaid"` \| `"m.minv.markUnpaid"` \| `"m.minv.cancelInv"` \| `"m.minv.reissue"` \| `"m.minv.duplicate"` \| `"m.minv.duplicated"` \| `"m.minv.backToList"` \| `"m.minv.loadError"` \| `"m.minv.saveError"` \| `"m.mord.orders"` \| `"m.mord.new"` \| `"m.mord.edit"` \| `"m.mord.reference"` \| `"m.mord.origin"` \| `"m.mord.destination"` \| `"m.mord.shipper"` \| `"m.mord.consignee"` \| `"m.mord.cargo"` \| `"m.mord.weight"` \| `"m.mord.price"` \| `"m.mord.currency"` \| `"m.mord.vehicle"` \| `"m.mord.assignee"` \| `"m.mord.unassigned"` \| `"m.mord.loadDate"` \| `"m.mord.unloadDate"` \| `"m.mord.notes"` \| `"m.mord.status.new"` \| `"m.mord.status.assigned"` \| `"m.mord.status.in_progress"` \| `"m.mord.status.delivered"` \| `"m.mord.status.invoiced"` \| `"m.mord.status.cancelled"` \| `"m.mord.badNumber"` \| `"m.mord.needData"` \| `"m.mord.empty"` \| `"m.mord.loadError"` \| `"m.mteam.role.owner"` \| `"m.mteam.role.dispatcher"` \| `"m.mteam.role.driver"` \| `"m.mteam.role.developer"` \| `"m.mmod.vehicles"` \| `"m.mmod.drivers"` \| `"m.mmod.cards"` \| `"m.mmod.forms"` \| `"m.mmod.reports"` \| `"m.mmod.map"` \| `"m.mmod.stats"` \| `"m.mmod.settlements"` \| `"m.mmod.orders"` \| `"m.mmod.checklists"` \| `"m.mmod.documents"` \| `"m.mmod.damages"` \| `"m.perm.none"` \| `"m.perm.view"` \| `"m.perm.edit"` \| `"m.mteam.members"` \| `"m.mteam.invite"` \| `"m.mteam.generate"` \| `"m.mteam.role"` \| `"m.mteam.permissions"` \| `"m.mteam.permHint"` \| `"m.mteam.managerNote"` \| `"m.mteam.ownerOnly"` \| `"m.mteam.empty"` \| `"m.mteam.loadError"` \| `"m.mteam.saveError"` \| `"m.mteam.inviteShare"` \| `"m.msvc.tasks"` \| `"m.msvc.new"` \| `"m.msvc.edit"` \| `"m.msvc.vehicle"` \| `"m.msvc.name"` \| `"m.msvc.namePh"` \| `"m.msvc.intervalKm"` \| `"m.msvc.intervalMonths"` \| `"m.msvc.lastDoneKm"` \| `"m.msvc.lastDoneDate"` \| `"m.msvc.notes"` \| `"m.msvc.markDone"` \| `"m.msvc.needVehicleName"` \| `"m.msvc.badNumber"` \| `"m.msvc.empty"` \| `"m.msvc.loadError"` \| `"m.msvc.everyKm"` \| `"m.msvc.everyMonths"` \| `"m.msvc.overdue"` \| `"m.msvc.remaining"` \| `"m.msvc.noVehicles"` \| `"m.msvc.days"` \| `"m.mdrv.drivers"` \| `"m.mdrv.new"` \| `"m.mdrv.edit"` \| `"m.mdrv.firstName"` \| `"m.mdrv.lastName"` \| `"m.mdrv.birthDate"` \| `"m.mdrv.categories"` \| `"m.mdrv.qualifications"` \| `"m.mdrv.notes"` \| `"m.mdrv.expiries"` \| `"m.mdrv.exp.license"` \| `"m.mdrv.exp.code95"` \| `"m.mdrv.exp.medical"` \| `"m.mdrv.exp.psychotech"` \| `"m.mdrv.exp.adr"` \| `"m.mdrv.exp.passport"` \| `"m.mdrv.exp.idCard"` \| `"m.mdrv.loadError"` \| `"m.mdrv.empty"` \| `"m.mdrv.expired"` \| `"m.mdrv.nextExpiry"` \| `"m.mvc.costs"` \| `"m.mvc.new"` \| `"m.mvc.vehicle"` \| `"m.mvc.category"` \| `"m.mvc.amount"` \| `"m.mvc.currency"` \| `"m.mvc.date"` \| `"m.mvc.description"` \| `"m.mvc.empty"` \| `"m.mvc.amountRequired"` \| `"m.mvc.cat.repair"` \| `"m.mvc.cat.leasing"` \| `"m.mvc.cat.insurance"` \| `"m.mvc.cat.tax"` \| `"m.mvc.cat.fine"` \| `"m.mvc.cat.parking"` \| `"m.mvc.cat.tires"` \| `"m.mvc.cat.other"` \| `"m.mctr.contractors"` \| `"m.mctr.new"` \| `"m.mctr.edit"` \| `"m.mctr.name"` \| `"m.mctr.namePh"` \| `"m.mctr.taxId"` \| `"m.mctr.address"` \| `"m.mctr.country"` \| `"m.mctr.needName"` \| `"m.mctr.empty"` \| `"m.mctr.exists"` \| `"m.mchk.templates"` \| `"m.mchk.newTemplate"` \| `"m.mchk.addDefaults"` \| `"m.mchk.editTitle"` \| `"m.mchk.name"` \| `"m.mchk.namePh"` \| `"m.mchk.active"` \| `"m.mchk.assignTo"` \| `"m.mchk.assignAll"` \| `"m.mchk.noDrivers"` \| `"m.mchk.items"` \| `"m.mchk.itemsShort"` \| `"m.mchk.question"` \| `"m.mchk.typeYesno"` \| `"m.mchk.typeMulti"` \| `"m.mchk.optionsPh"` \| `"m.mchk.photo"` \| `"m.mchk.time"` \| `"m.mchk.addItem"` \| `"m.mchk.save"` \| `"m.mchk.cancel"` \| `"m.mchk.needNameItems"` \| `"m.mchk.saveError"` \| `"m.mchk.empty"` \| `"m.mchk.on"` \| `"m.mchk.off"` \| `"m.mchk.loadError"` \| `"m.mchk.needLabels"` \| `"m.mchk.needMultiOptions"` \| `"m.manage.fleet"` \| `"m.manage.cards"` \| `"m.manage.newVehicle"` \| `"m.manage.editVehicle"` \| `"m.manage.newCard"` \| `"m.manage.editCard"` \| `"m.manage.registration"` \| `"m.manage.make"` \| `"m.manage.model"` \| `"m.manage.year"` \| `"m.manage.type"` \| `"m.manage.inspection"` \| `"m.manage.insurance"` \| `"m.manage.license"` \| `"m.manage.leasing"` \| `"m.manage.noDates"` \| `"m.manage.provider"` \| `"m.manage.cardNumber"` \| `"m.manage.validUntil"` \| `"m.manage.discount"` \| `"m.manage.assignVehicle"` \| `"m.manage.noVehicle"` \| `"m.manage.pin"` \| `"m.manage.pinKeep"` \| `"m.manage.save"` \| `"m.manage.cancel"` \| `"m.manage.delete"` \| `"m.manage.deleteTitle"` \| `"m.manage.deleteVehicle"` \| `"m.manage.deleteCard"` \| `"m.manage.saveError"` \| `"m.tacho.strip"` \| `"m.tacho.stripStart"` \| `"m.tacho.stripDriven"` \| `"m.tacho.stripAlert"` \| `"m.lock.title"` \| `"m.lock.prompt"` \| `"m.lock.unlock"` \| `"m.settings.security"` \| `"m.settings.appLockHint"` \| `"m.settings.appLockOn"` \| `"m.settings.appLockOff"` \| `"m.settings.appLockUnavailable"` \| `"m.game.title"` \| `"m.game.points"` \| `"m.game.toNext"` \| `"m.game.maxRank"` \| `"m.game.rank.rookie"` \| `"m.game.rank.driver"` \| `"m.game.rank.pro"` \| `"m.game.rank.veteran"` \| `"m.game.rank.master"` \| `"m.game.rank.legend"` \| `"m.game.badge.deliveries"` \| `"m.game.badge.punctual"` \| `"m.game.badge.checklists"` \| `"m.game.badge.km"` \| `"m.game.badge.veteran"` \| `"m.game.badge.caretaker"` \| `"m.game.badge.streak"` \| `"m.game.badge.eco"` \| `"m.game.tier.bronze"` \| `"m.game.tier.silver"` \| `"m.game.tier.gold"` \| `"m.fuel.cardPick"` \| `"m.fuel.cardNone"` \| `"m.tacho.gpsHint"` \| `"m.tacho.worktime"` \| `"m.tacho.worktimeHint"` \| `"m.tacho.live"` \| `"m.tacho.liveHint"` \| `"m.tacho.actDriving"` \| `"m.tacho.actBreak"` \| `"m.tacho.actWork"` \| `"m.tacho.actRest"` \| `"m.tacho.liveReset"` \| `"m.tacho.liveOff"` \| `"m.tacho.notifWarn"` \| `"m.tacho.notifNow"` \| `"m.tacho.scan"` \| `"m.tacho.scanHint"` \| `"m.tacho.scanNone"` \| `"m.tacho.scanNoCamera"` \| `"m.tacho.scanDetected"` \| `"m.tacho.assignContinuous"` \| `"m.tacho.assignDaily"` \| `"m.tacho.assignWeekly"` \| `"m.tacho.assignPrev"` \| `"m.tacho.planner"` \| `"m.tacho.plannerHint"` \| `"m.tacho.plannerEnd"` \| `"m.tacho.plannerType"` \| `"m.tacho.plannerRegular"` \| `"m.tacho.plannerReduced"` \| `"m.tacho.latestStart"` \| `"m.tacho.hoursLeft"` \| `"m.tacho.overdueRest"` \| `"m.tacho.mustRegular"` \| `"m.tacho.optRegular"` \| `"m.tacho.optReduced"` \| `"m.tacho.compensation"` \| `"m.screen.tacho"` \| `"m.tacho.counter"` \| `"m.tacho.counterHint"` \| `"m.tacho.inContinuous"` \| `"m.tacho.inBreakTaken"` \| `"m.tacho.inDaily"` \| `"m.tacho.inWeekly"` \| `"m.tacho.inPrevWeek"` \| `"m.tacho.inExtUsed"` \| `"m.tacho.inRedUsed"` \| `"m.tacho.toBreak"` \| `"m.tacho.reqBreak"` \| `"m.tacho.dailyLeft"` \| `"m.tacho.dailyLeftExt"` \| `"m.tacho.weekLeft"` \| `"m.tacho.twoWeekLeft"` \| `"m.tacho.extLeft"` \| `"m.tacho.redLeft"` \| `"m.tacho.alert"` \| `"m.tacho.guide"` \| `"m.tacho.guideDriving"` \| `"m.tacho.guideStop"` \| `"m.tacho.capJazdaMain"` \| `"m.tacho.capJazdaBreak"` \| `"m.tacho.capJazdaCycle"` \| `"m.tacho.capStopMain"` \| `"m.tacho.capStopUtc"` \| `"m.tacho.capStopCredits"` \| `"m.tacho.capStopWeek"` \| `"m.tacho.capStopDay"` \| `"m.tacho.capStopRest"` \| `"m.tacho.manual"` \| `"m.tacho.manualStep1"` \| `"m.tacho.manualStep2"` \| `"m.tacho.manualStep3"` \| `"m.tacho.manualStep4"` \| `"m.tacho.manualStep5"` \| `"m.tacho.manualStep6"` \| `"m.tacho.manualStep7"` \| `"m.tacho.regulation"` \| `"m.tacho.regulationHint"` \| `"m.settings.position"` \| `"m.settings.sharePosHint"` \| `"m.settings.sharePosOn"` \| `"m.settings.sharePosOff"` \| `"m.settings.sharePosEnabled"` \| `"m.settings.sharePosRemoved"` \| `"m.settings.sharePosDenied"` \| `"m.parking.rate"` \| `"m.parking.save"` \| `"m.parking.saved"` \| `"m.parking.error"` \| `"m.parking.noReviews"` \| `"m.parking.unnamed"` \| `"m.parking.shower"` \| `"m.parking.wc"` \| `"m.parking.food"` \| `"m.parking.security"` \| `"m.parking.notePlaceholder"` \| `"m.drawer.manage"` \| `"m.screen.schedule"` \| `"m.screen.fleetStatus"` \| `"m.screen.invoices"` \| `"m.schedule.inspection"` \| `"m.schedule.insurance"` \| `"m.schedule.leasing"` \| `"m.schedule.license"` \| `"m.schedule.drvLicense"` \| `"m.schedule.code95"` \| `"m.schedule.medical"` \| `"m.schedule.psycho"` \| `"m.schedule.adr"` \| `"m.schedule.passport"` \| `"m.schedule.idCard"` \| `"m.schedule.overdue"` \| `"m.schedule.days"` \| `"m.schedule.kmLeft"` \| `"m.schedule.deadlines"` \| `"m.schedule.empty"` \| `"m.schedule.error"` \| `"m.fleet.driving"` \| `"m.fleet.planned"` \| `"m.fleet.idle"` \| `"m.fleet.empty"` \| `"m.fleet.error"` \| `"m.invoices.monthSum"` \| `"m.invoices.list"` \| `"m.invoices.paid"` \| `"m.invoices.unpaid"` \| `"m.invoices.overdue"` \| `"m.invoices.cancelled"` \| `"m.invoices.due"` \| `"m.invoices.empty"` \| `"m.invoices.error"` \| `"m.invoices.hint"` \| `"m.screen.perDiem"` \| `"m.screen.payouts"` \| `"m.screen.fuelPrices"` \| `"m.perdiem.total"` \| `"m.perdiem.trips"` \| `"m.perdiem.daysUnit"` \| `"m.perdiem.domestic"` \| `"m.perdiem.foreign"` \| `"m.perdiem.empty"` \| `"m.perdiem.error"` \| `"m.perdiem.hint"` \| `"m.payouts.balance"` \| `"m.payouts.history"` \| `"m.payouts.due"` \| `"m.payouts.advance"` \| `"m.payouts.deduction"` \| `"m.payouts.payout"` \| `"m.payouts.empty"` \| `"m.payouts.error"` \| `"m.payouts.hint"` \| `"m.fuelPrices.subtitle"` \| `"m.fuelPrices.updated"` \| `"m.fuelPrices.cheapest"` \| `"m.fuelPrices.error"` \| `"m.card.kmMonth"` \| `"m.card.avgCons"` \| `"m.card.dieselMonth"` \| `"m.card.adblueMonth"` \| `"m.card.today"` \| `"m.card.checklistsDue"` \| `"m.card.checklistsHint"` \| `"m.card.unload"` \| `"m.card.pendingSync"` \| `"m.card.allClear"` \| `"m.live.inTransit"` \| `"m.live.delivered"` \| `"m.orders.segActive"` \| `"m.orders.segPlanned"` \| `"m.orders.segDone"` \| `"m.orders.emptyActive"` \| `"m.orders.emptyPlanned"` \| `"m.orders.emptyDone"` \| `"m.orders.start"` \| `"m.orders.markDelivered"` \| `"m.orders.swipeStart"` \| `"m.orders.swipeHint"` \| `"m.orders.statusSet"` \| `"m.orders.statusError"` \| `"m.orders.loadError"` \| `"m.more.work"` \| `"m.more.vehicleSec"` \| `"m.more.account"` \| `"m.more.chatTitle"` \| `"m.more.chatSub"` \| `"m.more.checklistsSub"` \| `"m.more.workTimeSub"` \| `"m.more.expensesSub"` \| `"m.more.settlementSub"` \| `"m.more.documentsSub"` \| `"m.more.defectsSub"` \| `"m.more.vehicleSub"` \| `"m.more.statsSub"` \| `"m.more.settingsSub"` \| `"m.more.logout"` \| `"m.exp.submitted"` \| `"m.exp.approved"` \| `"m.exp.rejected"` \| `"m.exp.waitCompany"` \| `"m.exp.listOffline"` \| `"m.exp.ocrRead"` \| `"m.exp.photoAttached"` \| `"m.exp.photoFail"` \| `"m.exp.amountInvalid"` \| `"m.exp.amount"` \| `"m.exp.note"` \| `"m.exp.photoBusy"` \| `"m.exp.photoChange"` \| `"m.exp.photoAdd"` \| `"m.exp.saving"` \| `"m.exp.submit"` \| `"m.exp.saved"` \| `"m.exp.savedOfflineNoPhoto"` \| `"m.exp.savedOffline"` \| `"m.exp.deleteFail"` \| `"m.exp.recent"` \| `"m.exp.empty"` \| `"m.exp.delete"` \| `"m.cat.toll"` \| `"m.cat.parking"` \| `"m.cat.repair"` \| `"m.cat.wash"` \| `"m.cat.other"` \| `"m.login.oauthDisabled"` \| `"m.login.missing"` \| `"m.login.failed"` \| `"m.login.appleFailed"` \| `"m.login.cancelled"` \| `"m.login.oauthFailed"` \| `"m.login.email"` \| `"m.login.password"` \| `"m.login.signIn"` \| `"m.login.or"` \| `"m.login.viaApple"` \| `"m.login.viaGoogle"` \| `"m.login.viaMicrosoft"` \| `"m.chat.channels"` \| `"m.chat.general"` \| `"m.chat.generalSub"` \| `"m.chat.privateSub"` \| `"m.chat.new"` \| `"m.chat.newHint"` \| `"m.chat.newTitle"` \| `"m.chat.namePh"` \| `"m.chat.members"` \| `"m.chat.membersFail"` \| `"m.chat.cancel"` \| `"m.chat.creating"` \| `"m.chat.create"` \| `"m.chat.loadChannelsFail"` \| `"m.chat.noCompany"` \| `"m.chat.createFail"` \| `"m.chat.loadFail"` \| `"m.chat.sendFail"` \| `"m.chat.photoFail"` \| `"m.chat.membersChangeFail"` \| `"m.chat.renameFail"` \| `"m.chat.empty"` \| `"m.chat.member"` \| `"m.chat.loadingPhoto"` \| `"m.chat.messagePh"` \| `"m.chat.settings"` \| `"m.chat.name"` \| `"m.chat.save"` \| `"m.chat.membersToggle"` \| `"m.chat.close"` \| `"m.login.passkeyNote"` \| `"m.map.locate"` \| `"m.map.poiLoad"` \| `"m.map.poiFuel"` \| `"m.map.permissionDenied"` \| `"m.map.poiError"` \| `"m.map.searchPlaceholder"` \| `"m.map.searchError"` \| `"m.map.searchTooShort"` \| `"m.map.noResults"` \| `"m.map.routeError"` \| `"m.map.planRoute"` \| `"m.map.planning"` \| `"m.map.alongFuel"` \| `"m.map.alongParking"` \| `"m.map.alongEmpty"` \| `"m.map.trafficShow"` \| `"m.map.trafficHide"` \| `"m.map.trafficError"` \| `"m.map.trafficNone"` \| `"m.trip.action"` \| `"m.trip.repeatLast"` \| `"m.trip.repeatFirst"` \| `"m.trip.repeatNone"` \| `"m.trip.repeatLoaded"` \| `"m.trip.country"` \| `"m.trip.city"` \| `"m.trip.postcode"` \| `"m.trip.company"` \| `"m.trip.companyPlaceholder"` \| `"m.trip.fromReg"` \| `"m.trip.toReg"` \| `"m.trip.odometer"` \| `"m.trip.weight"` \| `"m.trip.comment"` \| `"m.trip.required"` \| `"m.trip.order"` \| `"m.trip.orderNone"` \| `"m.trip.photoHintPick"` \| `"m.trip.photoHintNoOrders"` \| `"m.trip.recent"` \| `"m.trip.savedSynced"` \| `"m.trip.savedLocal"` \| `"m.trip.act.load"` \| `"m.trip.act.unload"` \| `"m.trip.act.transshipment"` \| `"m.trip.act.start"` \| `"m.trip.act.end"` \| `"m.trip.act.service"` \| `"m.trip.act.other"` \| `"m.chk.pickTemplate"` \| `"m.chk.none"` \| `"m.chk.itemsCount"` \| `"m.chk.yes"` \| `"m.chk.no"` \| `"m.chk.timeLabel"` \| `"m.chk.photoChange"` \| `"m.chk.photoAdd"` \| `"m.chk.viewOnly"` \| `"m.chk.submit"` \| `"m.chk.recent"` \| `"m.chk.fallback"` \| `"m.chk.photoAttached"` \| `"m.chk.photoOffline"` \| `"m.chk.loadError"` \| `"m.chk.savedSynced"` \| `"m.chk.savedLocal"` \| `"m.vtype.truck"` \| `"m.vtype.tractor"` \| `"m.vtype.van"` \| `"m.vtype.trailer"` \| `"m.vtype.other"`

##### params?

`Record`\<`string`, `string` \| `number`\>

#### Returns

`string`
