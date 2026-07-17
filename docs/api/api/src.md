[**e-logistic**](../index.md)

***

[e-logistic](../api/index.md) / api/src

# api/src

## Interfaces

### ActiveMembership

Defined in: [api/src/data/memberships.ts:5](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/memberships.ts#L5)

#### Properties

##### companyId

> **companyId**: `string`

Defined in: [api/src/data/memberships.ts:6](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/memberships.ts#L6)

##### createdAt

> **createdAt**: `string` \| `null`

Defined in: [api/src/data/memberships.ts:11](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/memberships.ts#L11)

Data dołączenia do firmy (staż) — ISO.

##### modules

> **modules**: `string`[] \| `null`

Defined in: [api/src/data/memberships.ts:8](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/memberships.ts#L8)

##### permissions

> **permissions**: `Partial`\<`Record`\<`"vehicles"` \| `"drivers"` \| `"cards"` \| `"forms"` \| `"reports"` \| `"map"` \| `"stats"` \| `"settlements"` \| `"orders"` \| `"checklists"` \| `"documents"` \| `"damages"`, `"none"` \| `"view"` \| `"edit"`\>\> \| `null`

Defined in: [api/src/data/memberships.ts:9](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/memberships.ts#L9)

##### role

> **role**: `"developer"` \| `"owner"` \| `"dispatcher"` \| `"driver"`

Defined in: [api/src/data/memberships.ts:7](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/memberships.ts#L7)

***

### AuditEntry

Defined in: [api/src/data/audit.ts:4](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/audit.ts#L4)

#### Properties

##### action

> **action**: `string`

Defined in: [api/src/data/audit.ts:7](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/audit.ts#L7)

##### actor\_id

> **actor\_id**: `string` \| `null`

Defined in: [api/src/data/audit.ts:6](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/audit.ts#L6)

##### created\_at

> **created\_at**: `string`

Defined in: [api/src/data/audit.ts:9](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/audit.ts#L9)

##### id

> **id**: `string`

Defined in: [api/src/data/audit.ts:5](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/audit.ts#L5)

##### target

> **target**: `string` \| `null`

Defined in: [api/src/data/audit.ts:8](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/audit.ts#L8)

***

### BlankInvoiceInput

Defined in: [api/src/data/invoices.ts:100](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/invoices.ts#L100)

#### Properties

##### buyerAddress?

> `optional` **buyerAddress?**: `string`

Defined in: [api/src/data/invoices.ts:103](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/invoices.ts#L103)

##### buyerName

> **buyerName**: `string`

Defined in: [api/src/data/invoices.ts:101](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/invoices.ts#L101)

##### buyerTaxId?

> `optional` **buyerTaxId?**: `string`

Defined in: [api/src/data/invoices.ts:102](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/invoices.ts#L102)

##### currency?

> `optional` **currency?**: `string`

Defined in: [api/src/data/invoices.ts:104](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/invoices.ts#L104)

***

### ChatMessage

Defined in: [api/src/data/messages.ts:9](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/messages.ts#L9)

#### Properties

##### body

> **body**: `string`

Defined in: [api/src/data/messages.ts:15](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/messages.ts#L15)

##### company\_id

> **company\_id**: `string`

Defined in: [api/src/data/messages.ts:11](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/messages.ts#L11)

##### created\_at

> **created\_at**: `string`

Defined in: [api/src/data/messages.ts:17](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/messages.ts#L17)

##### id

> **id**: `string`

Defined in: [api/src/data/messages.ts:10](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/messages.ts#L10)

##### photo\_path

> **photo\_path**: `string` \| `null`

Defined in: [api/src/data/messages.ts:16](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/messages.ts#L16)

##### sender\_id

> **sender\_id**: `string`

Defined in: [api/src/data/messages.ts:13](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/messages.ts#L13)

##### sender\_label

> **sender\_label**: `string`

Defined in: [api/src/data/messages.ts:14](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/messages.ts#L14)

##### thread\_id

> **thread\_id**: `string` \| `null`

Defined in: [api/src/data/messages.ts:12](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/messages.ts#L12)

***

### ChatThread

Defined in: [api/src/data/messages.ts:20](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/messages.ts#L20)

#### Properties

##### company\_id

> **company\_id**: `string`

Defined in: [api/src/data/messages.ts:22](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/messages.ts#L22)

##### created\_at

> **created\_at**: `string`

Defined in: [api/src/data/messages.ts:25](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/messages.ts#L25)

##### created\_by

> **created\_by**: `string`

Defined in: [api/src/data/messages.ts:24](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/messages.ts#L24)

##### id

> **id**: `string`

Defined in: [api/src/data/messages.ts:21](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/messages.ts#L21)

##### name

> **name**: `string`

Defined in: [api/src/data/messages.ts:23](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/messages.ts#L23)

***

### ChecklistSubmission

Defined in: [api/src/data/checklists.ts:14](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/checklists.ts#L14)

#### Properties

##### answers

> **answers**: [`ChecklistAnswers`](../api/core/src.md#checklistanswers)

Defined in: [api/src/data/checklists.ts:20](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/checklists.ts#L20)

##### created\_at

> **created\_at**: `string`

Defined in: [api/src/data/checklists.ts:21](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/checklists.ts#L21)

##### driver\_id

> **driver\_id**: `string` \| `null`

Defined in: [api/src/data/checklists.ts:17](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/checklists.ts#L17)

##### driver\_label

> **driver\_label**: `string`

Defined in: [api/src/data/checklists.ts:18](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/checklists.ts#L18)

##### id

> **id**: `string`

Defined in: [api/src/data/checklists.ts:15](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/checklists.ts#L15)

##### template\_name

> **template\_name**: `string`

Defined in: [api/src/data/checklists.ts:16](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/checklists.ts#L16)

##### vehicle\_id

> **vehicle\_id**: `string` \| `null`

Defined in: [api/src/data/checklists.ts:19](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/checklists.ts#L19)

***

### ChecklistSubmissionInput

Defined in: [api/src/data/checklists.ts:112](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/checklists.ts#L112)

#### Properties

##### answers

> **answers**: [`ChecklistAnswers`](../api/core/src.md#checklistanswers)

Defined in: [api/src/data/checklists.ts:117](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/checklists.ts#L117)

##### driverLabel

> **driverLabel**: `string`

Defined in: [api/src/data/checklists.ts:116](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/checklists.ts#L116)

##### templateId

> **templateId**: `string`

Defined in: [api/src/data/checklists.ts:113](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/checklists.ts#L113)

##### templateName

> **templateName**: `string`

Defined in: [api/src/data/checklists.ts:114](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/checklists.ts#L114)

##### vehicleId?

> `optional` **vehicleId?**: `string` \| `null`

Defined in: [api/src/data/checklists.ts:115](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/checklists.ts#L115)

***

### ChecklistTemplate

Defined in: [api/src/data/checklists.ts:5](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/checklists.ts#L5)

#### Properties

##### active

> **active**: `boolean`

Defined in: [api/src/data/checklists.ts:9](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/checklists.ts#L9)

##### assignedDrivers

> **assignedDrivers**: `string`[]

Defined in: [api/src/data/checklists.ts:11](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/checklists.ts#L11)

#338: przypisani kierowcy (id z kartoteki). Pusta = dla wszystkich.

##### id

> **id**: `string`

Defined in: [api/src/data/checklists.ts:6](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/checklists.ts#L6)

##### items

> **items**: [`ChecklistItem`](../api/core/src.md#checklistitem)[]

Defined in: [api/src/data/checklists.ts:8](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/checklists.ts#L8)

##### name

> **name**: `string`

Defined in: [api/src/data/checklists.ts:7](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/checklists.ts#L7)

***

### Company

Defined in: [api/src/data/companies.ts:5](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/companies.ts#L5)

#### Properties

##### address

> **address**: `string` \| `null`

Defined in: [api/src/data/companies.ts:9](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/companies.ts#L9)

##### bank\_account

> **bank\_account**: `string` \| `null`

Defined in: [api/src/data/companies.ts:15](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/companies.ts#L15)

##### bank\_name

> **bank\_name**: `string` \| `null`

Defined in: [api/src/data/companies.ts:14](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/companies.ts#L14)

##### country

> **country**: `string` \| `null`

Defined in: [api/src/data/companies.ts:10](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/companies.ts#L10)

##### default\_vat\_rate

> **default\_vat\_rate**: `number`

Defined in: [api/src/data/companies.ts:11](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/companies.ts#L11)

##### id

> **id**: `string`

Defined in: [api/src/data/companies.ts:6](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/companies.ts#L6)

##### name

> **name**: `string`

Defined in: [api/src/data/companies.ts:7](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/companies.ts#L7)

##### notify\_days\_ahead

> **notify\_days\_ahead**: `number` \| `null`

Defined in: [api/src/data/companies.ts:13](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/companies.ts#L13)

##### payment\_due\_days

> **payment\_due\_days**: `number`

Defined in: [api/src/data/companies.ts:12](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/companies.ts#L12)

##### tax\_id

> **tax\_id**: `string` \| `null`

Defined in: [api/src/data/companies.ts:8](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/companies.ts#L8)

***

### CompanyMember

Defined in: [api/src/data/memberships.ts:41](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/memberships.ts#L41)

#### Properties

##### email

> **email**: `string`

Defined in: [api/src/data/memberships.ts:43](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/memberships.ts#L43)

##### modules

> **modules**: `string`[] \| `null`

Defined in: [api/src/data/memberships.ts:45](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/memberships.ts#L45)

##### permissions

> **permissions**: [`MemberPermissions`](../api/core/src.md#memberpermissions)

Defined in: [api/src/data/memberships.ts:46](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/memberships.ts#L46)

##### role

> **role**: `"developer"` \| `"owner"` \| `"dispatcher"` \| `"driver"`

Defined in: [api/src/data/memberships.ts:44](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/memberships.ts#L44)

##### status

> **status**: `string`

Defined in: [api/src/data/memberships.ts:47](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/memberships.ts#L47)

##### user\_id

> **user\_id**: `string`

Defined in: [api/src/data/memberships.ts:42](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/memberships.ts#L42)

***

### CompanyPatch

Defined in: [api/src/data/companies.ts:34](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/companies.ts#L34)

#### Properties

##### address?

> `optional` **address?**: `string` \| `null`

Defined in: [api/src/data/companies.ts:37](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/companies.ts#L37)

##### bankAccount?

> `optional` **bankAccount?**: `string` \| `null`

Defined in: [api/src/data/companies.ts:43](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/companies.ts#L43)

##### bankName?

> `optional` **bankName?**: `string` \| `null`

Defined in: [api/src/data/companies.ts:42](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/companies.ts#L42)

##### country?

> `optional` **country?**: `string` \| `null`

Defined in: [api/src/data/companies.ts:38](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/companies.ts#L38)

##### defaultVatRate?

> `optional` **defaultVatRate?**: `number`

Defined in: [api/src/data/companies.ts:39](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/companies.ts#L39)

##### name

> **name**: `string`

Defined in: [api/src/data/companies.ts:35](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/companies.ts#L35)

##### notifyDaysAhead?

> `optional` **notifyDaysAhead?**: `number`

Defined in: [api/src/data/companies.ts:41](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/companies.ts#L41)

##### paymentDueDays?

> `optional` **paymentDueDays?**: `number`

Defined in: [api/src/data/companies.ts:40](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/companies.ts#L40)

##### taxId?

> `optional` **taxId?**: `string` \| `null`

Defined in: [api/src/data/companies.ts:36](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/companies.ts#L36)

***

### Contractor

Defined in: [api/src/data/contractors.ts:4](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/contractors.ts#L4)

#### Properties

##### address

> **address**: `string` \| `null`

Defined in: [api/src/data/contractors.ts:8](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/contractors.ts#L8)

##### country

> **country**: `string` \| `null`

Defined in: [api/src/data/contractors.ts:9](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/contractors.ts#L9)

##### id

> **id**: `string`

Defined in: [api/src/data/contractors.ts:5](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/contractors.ts#L5)

##### name

> **name**: `string`

Defined in: [api/src/data/contractors.ts:6](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/contractors.ts#L6)

##### tax\_id

> **tax\_id**: `string` \| `null`

Defined in: [api/src/data/contractors.ts:7](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/contractors.ts#L7)

***

### ContractorInput

Defined in: [api/src/data/contractors.ts:28](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/contractors.ts#L28)

#### Properties

##### address?

> `optional` **address?**: `string` \| `null`

Defined in: [api/src/data/contractors.ts:31](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/contractors.ts#L31)

##### country?

> `optional` **country?**: `string` \| `null`

Defined in: [api/src/data/contractors.ts:32](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/contractors.ts#L32)

##### name

> **name**: `string`

Defined in: [api/src/data/contractors.ts:29](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/contractors.ts#L29)

##### taxId?

> `optional` **taxId?**: `string` \| `null`

Defined in: [api/src/data/contractors.ts:30](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/contractors.ts#L30)

***

### DamageClaim

Defined in: [api/src/data/damageClaims.ts:5](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/damageClaims.ts#L5)

#### Properties

##### claim\_date

> **claim\_date**: `string`

Defined in: [api/src/data/damageClaims.ts:9](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/damageClaims.ts#L9)

##### claim\_number

> **claim\_number**: `string` \| `null`

Defined in: [api/src/data/damageClaims.ts:16](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/damageClaims.ts#L16)

##### cost

> **cost**: `number` \| `null`

Defined in: [api/src/data/damageClaims.ts:13](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/damageClaims.ts#L13)

##### created\_at

> **created\_at**: `string`

Defined in: [api/src/data/damageClaims.ts:18](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/damageClaims.ts#L18)

##### currency

> **currency**: `string`

Defined in: [api/src/data/damageClaims.ts:14](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/damageClaims.ts#L14)

##### description

> **description**: `string` \| `null`

Defined in: [api/src/data/damageClaims.ts:12](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/damageClaims.ts#L12)

##### driver\_name

> **driver\_name**: `string` \| `null`

Defined in: [api/src/data/damageClaims.ts:8](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/damageClaims.ts#L8)

##### id

> **id**: `string`

Defined in: [api/src/data/damageClaims.ts:6](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/damageClaims.ts#L6)

##### insurer

> **insurer**: `string` \| `null`

Defined in: [api/src/data/damageClaims.ts:15](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/damageClaims.ts#L15)

##### kind

> **kind**: `"other"` \| `"collision"` \| `"theft"` \| `"glass"` \| `"weather"` \| `"vandalism"`

Defined in: [api/src/data/damageClaims.ts:10](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/damageClaims.ts#L10)

##### note

> **note**: `string` \| `null`

Defined in: [api/src/data/damageClaims.ts:17](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/damageClaims.ts#L17)

##### status

> **status**: `"in_progress"` \| `"reported"` \| `"repaired"` \| `"closed"` \| `"rejected"`

Defined in: [api/src/data/damageClaims.ts:11](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/damageClaims.ts#L11)

##### vehicle\_id

> **vehicle\_id**: `string` \| `null`

Defined in: [api/src/data/damageClaims.ts:7](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/damageClaims.ts#L7)

***

### DamageClaimInput

Defined in: [api/src/data/damageClaims.ts:21](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/damageClaims.ts#L21)

#### Properties

##### claimDate

> **claimDate**: `string`

Defined in: [api/src/data/damageClaims.ts:24](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/damageClaims.ts#L24)

##### claimNumber?

> `optional` **claimNumber?**: `string` \| `null`

Defined in: [api/src/data/damageClaims.ts:31](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/damageClaims.ts#L31)

##### cost?

> `optional` **cost?**: `number` \| `null`

Defined in: [api/src/data/damageClaims.ts:28](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/damageClaims.ts#L28)

##### currency

> **currency**: `string`

Defined in: [api/src/data/damageClaims.ts:29](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/damageClaims.ts#L29)

##### description?

> `optional` **description?**: `string` \| `null`

Defined in: [api/src/data/damageClaims.ts:27](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/damageClaims.ts#L27)

##### driverName?

> `optional` **driverName?**: `string` \| `null`

Defined in: [api/src/data/damageClaims.ts:23](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/damageClaims.ts#L23)

##### insurer?

> `optional` **insurer?**: `string` \| `null`

Defined in: [api/src/data/damageClaims.ts:30](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/damageClaims.ts#L30)

##### kind

> **kind**: `"other"` \| `"collision"` \| `"theft"` \| `"glass"` \| `"weather"` \| `"vandalism"`

Defined in: [api/src/data/damageClaims.ts:25](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/damageClaims.ts#L25)

##### note?

> `optional` **note?**: `string` \| `null`

Defined in: [api/src/data/damageClaims.ts:32](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/damageClaims.ts#L32)

##### status

> **status**: `"in_progress"` \| `"reported"` \| `"repaired"` \| `"closed"` \| `"rejected"`

Defined in: [api/src/data/damageClaims.ts:26](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/damageClaims.ts#L26)

##### vehicleId?

> `optional` **vehicleId?**: `string` \| `null`

Defined in: [api/src/data/damageClaims.ts:22](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/damageClaims.ts#L22)

***

### DamagePhoto

Defined in: [api/src/data/damagePhotos.ts:12](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/damagePhotos.ts#L12)

#### Properties

##### name

> **name**: `string`

Defined in: [api/src/data/damagePhotos.ts:14](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/damagePhotos.ts#L14)

##### path

> **path**: `string`

Defined in: [api/src/data/damagePhotos.ts:13](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/damagePhotos.ts#L13)

##### signedUrl

> **signedUrl**: `string`

Defined in: [api/src/data/damagePhotos.ts:15](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/damagePhotos.ts#L15)

***

### Database

Defined in: [api/src/database.types.ts:6](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/database.types.ts#L6)

#### Properties

##### public

> **public**: `object`

Defined in: [api/src/database.types.ts:7](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/database.types.ts#L7)

###### CompositeTypes

> **CompositeTypes**: `object`

###### Enums

> **Enums**: `object`

###### Enums.fuel\_card\_provider

> **fuel\_card\_provider**: `"dkv"` \| `"eurowag"` \| `"shell"` \| `"bp"` \| `"circlek"` \| `"e100"` \| `"uta"` \| `"as24"` \| `"aral"` \| `"omv"` \| `"routex"` \| `"logpay"` \| `"esso"` \| `"totalenergies"` \| `"tankpool24"` \| `"morganfuels"` \| `"iqcard"` \| `"other"`

###### Enums.membership\_status

> **membership\_status**: `"active"` \| `"invited"` \| `"disabled"`

###### Enums.order\_status

> **order\_status**: `"new"` \| `"assigned"` \| `"in_progress"` \| `"delivered"` \| `"invoiced"` \| `"cancelled"`

###### Enums.payment\_method

> **payment\_method**: `"card"` \| `"cash"`

###### Enums.poi\_type

> **poi\_type**: `"parking"` \| `"fuel_station"` \| `"ferry"` \| `"airport"` \| `"company"` \| `"wash"` \| `"weigh"`

###### Enums.report\_type

> **report\_type**: `"weigh"` \| `"accident"` \| `"police"` \| `"closure"` \| `"traffic"` \| `"hazard"`

###### Enums.role

> **role**: `"developer"` \| `"owner"` \| `"dispatcher"` \| `"driver"`

###### Enums.trip\_action

> **trip\_action**: `"other"` \| `"load"` \| `"unload"` \| `"transshipment"` \| `"start"` \| `"end"` \| `"service"`

###### Enums.vehicle\_type

> **vehicle\_type**: `"other"` \| `"truck"` \| `"tractor"` \| `"van"` \| `"trailer"`

###### Functions

> **Functions**: `object`

###### Functions.\_card\_key

> **\_card\_key**: `object`

###### Functions.\_card\_key.Args

> **Args**: `Record`\<`PropertyKey`, `never`\>

###### Functions.\_card\_key.Returns

> **Returns**: `string`

###### Functions.\_pii\_key

> **\_pii\_key**: `object`

###### Functions.\_pii\_key.Args

> **Args**: `Record`\<`PropertyKey`, `never`\>

###### Functions.\_pii\_key.Returns

> **Returns**: `string`

###### Functions.accept\_invite

> **accept\_invite**: `object`

###### Functions.accept\_invite.Args

> **Args**: `object`

###### Functions.accept\_invite.Args.p\_token

> **p\_token**: `string` \| `null`

###### Functions.accept\_invite.Returns

> **Returns**: `string`

###### Functions.bootstrap\_company

> **bootstrap\_company**: `object`

###### Functions.bootstrap\_company.Args

> **Args**: `object`

###### Functions.bootstrap\_company.Args.p\_name

> **p\_name**: `string` \| `null`

###### Functions.bootstrap\_company.Returns

> **Returns**: `string`

###### Functions.company\_members

> **company\_members**: `object`

###### Functions.company\_members.Args

> **Args**: `Record`\<`PropertyKey`, `never`\>

###### Functions.company\_members.Returns

> **Returns**: `object`[]

###### Functions.company\_wipe\_data

> **company\_wipe\_data**: `object`

###### Functions.company\_wipe\_data.Args

> **Args**: `object`

###### Functions.company\_wipe\_data.Args.p\_company

> **p\_company**: `string` \| `null`

###### Functions.company\_wipe\_data.Args.p\_confirm\_name

> **p\_confirm\_name**: `string` \| `null`

###### Functions.company\_wipe\_data.Returns

> **Returns**: [`Json`](../api/api/src.md#json)

###### Functions.create\_blank\_invoice

> **create\_blank\_invoice**: `object`

###### Functions.create\_blank\_invoice.Args

> **Args**: `object`

###### Functions.create\_blank\_invoice.Args.p\_buyer\_address?

> `optional` **p\_buyer\_address?**: `string` \| `null`

###### Functions.create\_blank\_invoice.Args.p\_buyer\_name

> **p\_buyer\_name**: `string` \| `null`

###### Functions.create\_blank\_invoice.Args.p\_buyer\_tax\_id?

> `optional` **p\_buyer\_tax\_id?**: `string` \| `null`

###### Functions.create\_blank\_invoice.Args.p\_company

> **p\_company**: `string` \| `null`

###### Functions.create\_blank\_invoice.Args.p\_currency?

> `optional` **p\_currency?**: `string` \| `null`

###### Functions.create\_blank\_invoice.Returns

> **Returns**: [`Json`](../api/api/src.md#json)

###### Functions.create\_invite

> **create\_invite**: `object`

###### Functions.create\_invite.Args

> **Args**: `object`

###### Functions.create\_invite.Args.p\_email?

> `optional` **p\_email?**: `string` \| `null`

###### Functions.create\_invite.Args.p\_permissions?

> `optional` **p\_permissions?**: [`Json`](../api/api/src.md#json)

###### Functions.create\_invite.Args.p\_role?

> `optional` **p\_role?**: `"developer"` \| `"owner"` \| `"dispatcher"` \| `"driver"` \| `null`

###### Functions.create\_invite.Args.p\_vehicle?

> `optional` **p\_vehicle?**: `string` \| `null`

###### Functions.create\_invite.Returns

> **Returns**: `string`

###### Functions.create\_invoice

> **create\_invoice**: `object`

###### Functions.create\_invoice.Args

> **Args**: `object`

###### Functions.create\_invoice.Args.p\_order

> **p\_order**: `string` \| `null`

###### Functions.create\_invoice.Args.p\_vat\_rate?

> `optional` **p\_vat\_rate?**: `number` \| `null`

###### Functions.create\_invoice.Returns

> **Returns**: [`Json`](../api/api/src.md#json)

###### Functions.dev\_stats

> **dev\_stats**: `object`

###### Functions.dev\_stats.Args

> **Args**: `Record`\<`PropertyKey`, `never`\>

###### Functions.dev\_stats.Returns

> **Returns**: [`Json`](../api/api/src.md#json)

###### Functions.driver\_documents

> **driver\_documents**: `object`

###### Functions.driver\_documents.Args

> **Args**: `object`

###### Functions.driver\_documents.Args.p\_driver

> **p\_driver**: `string` \| `null`

###### Functions.driver\_documents.Returns

> **Returns**: [`Json`](../api/api/src.md#json)

###### Functions.driver\_link\_user

> **driver\_link\_user**: `object`

###### Functions.driver\_link\_user.Args

> **Args**: `object`

###### Functions.driver\_link\_user.Args.p\_company

> **p\_company**: `string` \| `null`

###### Functions.driver\_link\_user.Args.p\_driver

> **p\_driver**: `string` \| `null`

###### Functions.driver\_link\_user.Args.p\_user

> **p\_user**: `string` \| `null`

###### Functions.driver\_link\_user.Returns

> **Returns**: `undefined`

###### Functions.driver\_save

> **driver\_save**: `object`

###### Functions.driver\_save.Args

> **Args**: `object`

###### Functions.driver\_save.Args.p\_adr\_expiry?

> `optional` **p\_adr\_expiry?**: `string` \| `null`

###### Functions.driver\_save.Args.p\_birth

> **p\_birth**: `string` \| `null`

###### Functions.driver\_save.Args.p\_categories

> **p\_categories**: `string`[] \| `null`

###### Functions.driver\_save.Args.p\_code95\_expiry?

> `optional` **p\_code95\_expiry?**: `string` \| `null`

###### Functions.driver\_save.Args.p\_company

> **p\_company**: `string` \| `null`

###### Functions.driver\_save.Args.p\_first

> **p\_first**: `string` \| `null`

###### Functions.driver\_save.Args.p\_id

> **p\_id**: `string` \| `null`

###### Functions.driver\_save.Args.p\_id\_card\_expiry?

> `optional` **p\_id\_card\_expiry?**: `string` \| `null`

###### Functions.driver\_save.Args.p\_last

> **p\_last**: `string` \| `null`

###### Functions.driver\_save.Args.p\_license\_expiry?

> `optional` **p\_license\_expiry?**: `string` \| `null`

###### Functions.driver\_save.Args.p\_medical\_expiry?

> `optional` **p\_medical\_expiry?**: `string` \| `null`

###### Functions.driver\_save.Args.p\_notes

> **p\_notes**: `string` \| `null`

###### Functions.driver\_save.Args.p\_passport\_expiry?

> `optional` **p\_passport\_expiry?**: `string` \| `null`

###### Functions.driver\_save.Args.p\_psychotech\_expiry?

> `optional` **p\_psychotech\_expiry?**: `string` \| `null`

###### Functions.driver\_save.Args.p\_qual\_details?

> `optional` **p\_qual\_details?**: [`Json`](../api/api/src.md#json)

###### Functions.driver\_save.Args.p\_quals

> **p\_quals**: `string`[] \| `null`

###### Functions.driver\_save.Returns

> **Returns**: `string`

###### Functions.driver\_set\_documents

> **driver\_set\_documents**: `object`

###### Functions.driver\_set\_documents.Args

> **Args**: `object`

###### Functions.driver\_set\_documents.Args.p\_driver

> **p\_driver**: `string` \| `null`

###### Functions.driver\_set\_documents.Args.p\_id\_card

> **p\_id\_card**: `string` \| `null`

###### Functions.driver\_set\_documents.Args.p\_license

> **p\_license**: `string` \| `null`

###### Functions.driver\_set\_documents.Args.p\_passport

> **p\_passport**: `string` \| `null`

###### Functions.driver\_set\_documents.Returns

> **Returns**: `undefined`

###### Functions.duplicate\_invoice

> **duplicate\_invoice**: `object`

###### Functions.duplicate\_invoice.Args

> **Args**: `object`

###### Functions.duplicate\_invoice.Args.p\_invoice

> **p\_invoice**: `string` \| `null`

###### Functions.duplicate\_invoice.Returns

> **Returns**: [`Json`](../api/api/src.md#json)

###### Functions.fuel\_card\_pin

> **fuel\_card\_pin**: `object`

###### Functions.fuel\_card\_pin.Args

> **Args**: `object`

###### Functions.fuel\_card\_pin.Args.p\_card

> **p\_card**: `string` \| `null`

###### Functions.fuel\_card\_pin.Returns

> **Returns**: `string`

###### Functions.fuel\_card\_set\_pin

> **fuel\_card\_set\_pin**: `object`

###### Functions.fuel\_card\_set\_pin.Args

> **Args**: `object`

###### Functions.fuel\_card\_set\_pin.Args.p\_card

> **p\_card**: `string` \| `null`

###### Functions.fuel\_card\_set\_pin.Args.p\_pin

> **p\_pin**: `string` \| `null`

###### Functions.fuel\_card\_set\_pin.Returns

> **Returns**: `undefined`

###### Functions.generate\_expiry\_notifications

> **generate\_expiry\_notifications**: `object`

###### Functions.generate\_expiry\_notifications.Args

> **Args**: `object`

###### Functions.generate\_expiry\_notifications.Args.p\_company

> **p\_company**: `string` \| `null`

###### Functions.generate\_expiry\_notifications.Returns

> **Returns**: `undefined`

###### Functions.has\_role

> **has\_role**: `object`

###### Functions.has\_role.Args

> **Args**: `object`

###### Functions.has\_role.Args.p\_company

> **p\_company**: `string` \| `null`

###### Functions.has\_role.Args.p\_roles

> **p\_roles**: (`"developer"` \| `"owner"` \| `"dispatcher"` \| `"driver"`)[] \| `null`

###### Functions.has\_role.Returns

> **Returns**: `boolean`

###### Functions.is\_assigned\_to\_vehicle

> **is\_assigned\_to\_vehicle**: `object`

###### Functions.is\_assigned\_to\_vehicle.Args

> **Args**: `object`

###### Functions.is\_assigned\_to\_vehicle.Args.p\_vehicle

> **p\_vehicle**: `string` \| `null`

###### Functions.is\_assigned\_to\_vehicle.Returns

> **Returns**: `boolean`

###### Functions.is\_developer

> **is\_developer**: `object`

###### Functions.is\_developer.Args

> **Args**: `Record`\<`PropertyKey`, `never`\>

###### Functions.is\_developer.Returns

> **Returns**: `boolean`

###### Functions.is\_member\_of

> **is\_member\_of**: `object`

###### Functions.is\_member\_of.Args

> **Args**: `object`

###### Functions.is\_member\_of.Args.p\_company

> **p\_company**: `string` \| `null`

###### Functions.is\_member\_of.Returns

> **Returns**: `boolean`

###### Functions.is\_thread\_member

> **is\_thread\_member**: `object`

###### Functions.is\_thread\_member.Args

> **Args**: `object`

###### Functions.is\_thread\_member.Args.p\_thread

> **p\_thread**: `string` \| `null`

###### Functions.is\_thread\_member.Returns

> **Returns**: `boolean`

###### Functions.list\_drivers

> **list\_drivers**: `object`

###### Functions.list\_drivers.Args

> **Args**: `object`

###### Functions.list\_drivers.Args.p\_company

> **p\_company**: `string` \| `null`

###### Functions.list\_drivers.Returns

> **Returns**: [`Json`](../api/api/src.md#json)

###### Functions.list\_fuel\_cards\_for\_user

> **list\_fuel\_cards\_for\_user**: `object`

###### Functions.list\_fuel\_cards\_for\_user.Args

> **Args**: `Record`\<`PropertyKey`, `never`\>

###### Functions.list\_fuel\_cards\_for\_user.Returns

> **Returns**: `object`[]

###### Functions.list\_invites

> **list\_invites**: `object`

###### Functions.list\_invites.Args

> **Args**: `object`

###### Functions.list\_invites.Args.p\_company

> **p\_company**: `string` \| `null`

###### Functions.list\_invites.Returns

> **Returns**: [`Json`](../api/api/src.md#json)

###### Functions.list\_visible\_checklist\_templates

> **list\_visible\_checklist\_templates**: `object`

###### Functions.list\_visible\_checklist\_templates.Args

> **Args**: `Record`\<`PropertyKey`, `never`\>

###### Functions.list\_visible\_checklist\_templates.Returns

> **Returns**: `object`[]

###### Functions.my\_driver\_identity

> **my\_driver\_identity**: `object`

###### Functions.my\_driver\_identity.Args

> **Args**: `Record`\<`PropertyKey`, `never`\>

###### Functions.my\_driver\_identity.Returns

> **Returns**: [`Json`](../api/api/src.md#json)

###### Functions.notify\_company

> **notify\_company**: `object`

###### Functions.notify\_company.Args

> **Args**: `object`

###### Functions.notify\_company.Args.p\_body

> **p\_body**: `string` \| `null`

###### Functions.notify\_company.Args.p\_company

> **p\_company**: `string` \| `null`

###### Functions.notify\_company.Args.p\_severity

> **p\_severity**: `string` \| `null`

###### Functions.notify\_company.Args.p\_title

> **p\_title**: `string` \| `null`

###### Functions.notify\_company.Args.p\_type

> **p\_type**: `string` \| `null`

###### Functions.notify\_company.Returns

> **Returns**: `undefined`

###### Functions.order\_set\_status

> **order\_set\_status**: `object`

###### Functions.order\_set\_status.Args

> **Args**: `object`

###### Functions.order\_set\_status.Args.p\_order

> **p\_order**: `string` \| `null`

###### Functions.order\_set\_status.Args.p\_status

> **p\_status**: `"new"` \| `"assigned"` \| `"in_progress"` \| `"delivered"` \| `"invoiced"` \| `"cancelled"` \| `null`

###### Functions.order\_set\_status.Returns

> **Returns**: `undefined`

###### Functions.order\_tracking

> **order\_tracking**: `object`

###### Functions.order\_tracking.Args

> **Args**: `object`

###### Functions.order\_tracking.Args.p\_token

> **p\_token**: `string` \| `null`

###### Functions.order\_tracking.Returns

> **Returns**: `object`[]

###### Functions.send\_driver\_route

> **send\_driver\_route**: `object`

###### Functions.send\_driver\_route.Args

> **Args**: `object`

###### Functions.send\_driver\_route.Args.p\_company

> **p\_company**: `string` \| `null`

###### Functions.send\_driver\_route.Args.p\_driver

> **p\_driver**: `string` \| `null`

###### Functions.send\_driver\_route.Args.p\_geometry

> **p\_geometry**: [`Json`](../api/api/src.md#json)

###### Functions.send\_driver\_route.Args.p\_name

> **p\_name**: `string` \| `null`

###### Functions.send\_driver\_route.Args.p\_stops

> **p\_stops**: [`Json`](../api/api/src.md#json)

###### Functions.send\_driver\_route.Args.p\_summary

> **p\_summary**: [`Json`](../api/api/src.md#json)

###### Functions.send\_driver\_route.Returns

> **Returns**: `string`

###### Functions.thread\_company

> **thread\_company**: `object`

###### Functions.thread\_company.Args

> **Args**: `object`

###### Functions.thread\_company.Args.p\_thread

> **p\_thread**: `string` \| `null`

###### Functions.thread\_company.Returns

> **Returns**: `string`

###### Tables

> **Tables**: `object`

###### Tables.adblue\_log\_revisions

> **adblue\_log\_revisions**: `object`

###### Tables.adblue\_log\_revisions.Insert

> **Insert**: `object`

###### Tables.adblue\_log\_revisions.Insert.adblue\_log\_id

> **adblue\_log\_id**: `string`

###### Tables.adblue\_log\_revisions.Insert.edited\_at?

> `optional` **edited\_at?**: `string`

###### Tables.adblue\_log\_revisions.Insert.edited\_by?

> `optional` **edited\_by?**: `string` \| `null`

###### Tables.adblue\_log\_revisions.Insert.id?

> `optional` **id?**: `string`

###### Tables.adblue\_log\_revisions.Insert.revision

> **revision**: `number`

###### Tables.adblue\_log\_revisions.Insert.snapshot

> **snapshot**: [`Json`](../api/api/src.md#json)

###### Tables.adblue\_log\_revisions.Relationships

> **Relationships**: \[\]

###### Tables.adblue\_log\_revisions.Row

> **Row**: `object`

###### Tables.adblue\_log\_revisions.Row.adblue\_log\_id

> **adblue\_log\_id**: `string`

###### Tables.adblue\_log\_revisions.Row.edited\_at

> **edited\_at**: `string`

###### Tables.adblue\_log\_revisions.Row.edited\_by

> **edited\_by**: `string` \| `null`

###### Tables.adblue\_log\_revisions.Row.id

> **id**: `string`

###### Tables.adblue\_log\_revisions.Row.revision

> **revision**: `number`

###### Tables.adblue\_log\_revisions.Row.snapshot

> **snapshot**: [`Json`](../api/api/src.md#json)

###### Tables.adblue\_log\_revisions.Update

> **Update**: `object`

###### Tables.adblue\_log\_revisions.Update.adblue\_log\_id?

> `optional` **adblue\_log\_id?**: `string`

###### Tables.adblue\_log\_revisions.Update.edited\_at?

> `optional` **edited\_at?**: `string`

###### Tables.adblue\_log\_revisions.Update.edited\_by?

> `optional` **edited\_by?**: `string` \| `null`

###### Tables.adblue\_log\_revisions.Update.id?

> `optional` **id?**: `string`

###### Tables.adblue\_log\_revisions.Update.revision?

> `optional` **revision?**: `number`

###### Tables.adblue\_log\_revisions.Update.snapshot?

> `optional` **snapshot?**: [`Json`](../api/api/src.md#json)

###### Tables.adblue\_logs

> **adblue\_logs**: `object`

###### Tables.adblue\_logs.Insert

> **Insert**: `object`

###### Tables.adblue\_logs.Insert.comment?

> `optional` **comment?**: `string` \| `null`

###### Tables.adblue\_logs.Insert.company\_id

> **company\_id**: `string`

###### Tables.adblue\_logs.Insert.created\_at?

> `optional` **created\_at?**: `string`

###### Tables.adblue\_logs.Insert.device\_id?

> `optional` **device\_id?**: `string` \| `null`

###### Tables.adblue\_logs.Insert.driver\_id

> **driver\_id**: `string`

###### Tables.adblue\_logs.Insert.fuel\_card\_id?

> `optional` **fuel\_card\_id?**: `string` \| `null`

###### Tables.adblue\_logs.Insert.geo?

> `optional` **geo?**: `unknown`

###### Tables.adblue\_logs.Insert.id

> **id**: `string`

###### Tables.adblue\_logs.Insert.is\_full?

> `optional` **is\_full?**: `boolean`

###### Tables.adblue\_logs.Insert.liters

> **liters**: `number`

###### Tables.adblue\_logs.Insert.odometer\_km

> **odometer\_km**: `number`

###### Tables.adblue\_logs.Insert.payment\_method

> **payment\_method**: `"card"` \| `"cash"`

###### Tables.adblue\_logs.Insert.price\_total?

> `optional` **price\_total?**: `number` \| `null`

###### Tables.adblue\_logs.Insert.revision?

> `optional` **revision?**: `number`

###### Tables.adblue\_logs.Insert.station\_city?

> `optional` **station\_city?**: `string` \| `null`

###### Tables.adblue\_logs.Insert.station\_company?

> `optional` **station\_company?**: `string` \| `null`

###### Tables.adblue\_logs.Insert.station\_country

> **station\_country**: `string`

###### Tables.adblue\_logs.Insert.station\_loc?

> `optional` **station\_loc?**: `string` \| `null`

###### Tables.adblue\_logs.Insert.station\_postcode?

> `optional` **station\_postcode?**: `string` \| `null`

###### Tables.adblue\_logs.Insert.synced\_at?

> `optional` **synced\_at?**: `string` \| `null`

###### Tables.adblue\_logs.Insert.updated\_at?

> `optional` **updated\_at?**: `string`

###### Tables.adblue\_logs.Insert.vehicle\_id

> **vehicle\_id**: `string`

###### Tables.adblue\_logs.Relationships

> **Relationships**: \[\]

###### Tables.adblue\_logs.Row

> **Row**: `object`

###### Tables.adblue\_logs.Row.comment

> **comment**: `string` \| `null`

###### Tables.adblue\_logs.Row.company\_id

> **company\_id**: `string`

###### Tables.adblue\_logs.Row.created\_at

> **created\_at**: `string`

###### Tables.adblue\_logs.Row.device\_id

> **device\_id**: `string` \| `null`

###### Tables.adblue\_logs.Row.driver\_id

> **driver\_id**: `string`

###### Tables.adblue\_logs.Row.fuel\_card\_id

> **fuel\_card\_id**: `string` \| `null`

###### Tables.adblue\_logs.Row.geo

> **geo**: `unknown`

###### Tables.adblue\_logs.Row.id

> **id**: `string`

###### Tables.adblue\_logs.Row.is\_full

> **is\_full**: `boolean`

###### Tables.adblue\_logs.Row.liters

> **liters**: `number`

###### Tables.adblue\_logs.Row.odometer\_km

> **odometer\_km**: `number`

###### Tables.adblue\_logs.Row.payment\_method

> **payment\_method**: `"card"` \| `"cash"`

###### Tables.adblue\_logs.Row.price\_total

> **price\_total**: `number` \| `null`

###### Tables.adblue\_logs.Row.revision

> **revision**: `number`

###### Tables.adblue\_logs.Row.station\_city

> **station\_city**: `string` \| `null`

###### Tables.adblue\_logs.Row.station\_company

> **station\_company**: `string` \| `null`

###### Tables.adblue\_logs.Row.station\_country

> **station\_country**: `string`

###### Tables.adblue\_logs.Row.station\_loc

> **station\_loc**: `string` \| `null`

###### Tables.adblue\_logs.Row.station\_postcode

> **station\_postcode**: `string` \| `null`

###### Tables.adblue\_logs.Row.synced\_at

> **synced\_at**: `string` \| `null`

###### Tables.adblue\_logs.Row.updated\_at

> **updated\_at**: `string`

###### Tables.adblue\_logs.Row.vehicle\_id

> **vehicle\_id**: `string`

###### Tables.adblue\_logs.Update

> **Update**: `object`

###### Tables.adblue\_logs.Update.comment?

> `optional` **comment?**: `string` \| `null`

###### Tables.adblue\_logs.Update.company\_id?

> `optional` **company\_id?**: `string`

###### Tables.adblue\_logs.Update.created\_at?

> `optional` **created\_at?**: `string`

###### Tables.adblue\_logs.Update.device\_id?

> `optional` **device\_id?**: `string` \| `null`

###### Tables.adblue\_logs.Update.driver\_id?

> `optional` **driver\_id?**: `string`

###### Tables.adblue\_logs.Update.fuel\_card\_id?

> `optional` **fuel\_card\_id?**: `string` \| `null`

###### Tables.adblue\_logs.Update.geo?

> `optional` **geo?**: `unknown`

###### Tables.adblue\_logs.Update.id?

> `optional` **id?**: `string`

###### Tables.adblue\_logs.Update.is\_full?

> `optional` **is\_full?**: `boolean`

###### Tables.adblue\_logs.Update.liters?

> `optional` **liters?**: `number`

###### Tables.adblue\_logs.Update.odometer\_km?

> `optional` **odometer\_km?**: `number`

###### Tables.adblue\_logs.Update.payment\_method?

> `optional` **payment\_method?**: `"card"` \| `"cash"`

###### Tables.adblue\_logs.Update.price\_total?

> `optional` **price\_total?**: `number` \| `null`

###### Tables.adblue\_logs.Update.revision?

> `optional` **revision?**: `number`

###### Tables.adblue\_logs.Update.station\_city?

> `optional` **station\_city?**: `string` \| `null`

###### Tables.adblue\_logs.Update.station\_company?

> `optional` **station\_company?**: `string` \| `null`

###### Tables.adblue\_logs.Update.station\_country?

> `optional` **station\_country?**: `string`

###### Tables.adblue\_logs.Update.station\_loc?

> `optional` **station\_loc?**: `string` \| `null`

###### Tables.adblue\_logs.Update.station\_postcode?

> `optional` **station\_postcode?**: `string` \| `null`

###### Tables.adblue\_logs.Update.synced\_at?

> `optional` **synced\_at?**: `string` \| `null`

###### Tables.adblue\_logs.Update.updated\_at?

> `optional` **updated\_at?**: `string`

###### Tables.adblue\_logs.Update.vehicle\_id?

> `optional` **vehicle\_id?**: `string`

###### Tables.audit\_log

> **audit\_log**: `object`

###### Tables.audit\_log.Insert

> **Insert**: `object`

###### Tables.audit\_log.Insert.action

> **action**: `string`

###### Tables.audit\_log.Insert.actor\_id?

> `optional` **actor\_id?**: `string` \| `null`

###### Tables.audit\_log.Insert.company\_id?

> `optional` **company\_id?**: `string` \| `null`

###### Tables.audit\_log.Insert.created\_at?

> `optional` **created\_at?**: `string`

###### Tables.audit\_log.Insert.id?

> `optional` **id?**: `string`

###### Tables.audit\_log.Insert.meta?

> `optional` **meta?**: [`Json`](../api/api/src.md#json)

###### Tables.audit\_log.Insert.target?

> `optional` **target?**: `string` \| `null`

###### Tables.audit\_log.Relationships

> **Relationships**: \[\]

###### Tables.audit\_log.Row

> **Row**: `object`

###### Tables.audit\_log.Row.action

> **action**: `string`

###### Tables.audit\_log.Row.actor\_id

> **actor\_id**: `string` \| `null`

###### Tables.audit\_log.Row.company\_id

> **company\_id**: `string` \| `null`

###### Tables.audit\_log.Row.created\_at

> **created\_at**: `string`

###### Tables.audit\_log.Row.id

> **id**: `string`

###### Tables.audit\_log.Row.meta

> **meta**: [`Json`](../api/api/src.md#json)

###### Tables.audit\_log.Row.target

> **target**: `string` \| `null`

###### Tables.audit\_log.Update

> **Update**: `object`

###### Tables.audit\_log.Update.action?

> `optional` **action?**: `string`

###### Tables.audit\_log.Update.actor\_id?

> `optional` **actor\_id?**: `string` \| `null`

###### Tables.audit\_log.Update.company\_id?

> `optional` **company\_id?**: `string` \| `null`

###### Tables.audit\_log.Update.created\_at?

> `optional` **created\_at?**: `string`

###### Tables.audit\_log.Update.id?

> `optional` **id?**: `string`

###### Tables.audit\_log.Update.meta?

> `optional` **meta?**: [`Json`](../api/api/src.md#json)

###### Tables.audit\_log.Update.target?

> `optional` **target?**: `string` \| `null`

###### Tables.card\_assignments

> **card\_assignments**: `object`

###### Tables.card\_assignments.Insert

> **Insert**: `object`

###### Tables.card\_assignments.Insert.active?

> `optional` **active?**: `boolean`

###### Tables.card\_assignments.Insert.fuel\_card\_id

> **fuel\_card\_id**: `string`

###### Tables.card\_assignments.Insert.id?

> `optional` **id?**: `string`

###### Tables.card\_assignments.Insert.user\_id?

> `optional` **user\_id?**: `string` \| `null`

###### Tables.card\_assignments.Insert.vehicle\_id?

> `optional` **vehicle\_id?**: `string` \| `null`

###### Tables.card\_assignments.Relationships

> **Relationships**: \[\]

###### Tables.card\_assignments.Row

> **Row**: `object`

###### Tables.card\_assignments.Row.active

> **active**: `boolean`

###### Tables.card\_assignments.Row.fuel\_card\_id

> **fuel\_card\_id**: `string`

###### Tables.card\_assignments.Row.id

> **id**: `string`

###### Tables.card\_assignments.Row.user\_id

> **user\_id**: `string` \| `null`

###### Tables.card\_assignments.Row.vehicle\_id

> **vehicle\_id**: `string` \| `null`

###### Tables.card\_assignments.Update

> **Update**: `object`

###### Tables.card\_assignments.Update.active?

> `optional` **active?**: `boolean`

###### Tables.card\_assignments.Update.fuel\_card\_id?

> `optional` **fuel\_card\_id?**: `string`

###### Tables.card\_assignments.Update.id?

> `optional` **id?**: `string`

###### Tables.card\_assignments.Update.user\_id?

> `optional` **user\_id?**: `string` \| `null`

###### Tables.card\_assignments.Update.vehicle\_id?

> `optional` **vehicle\_id?**: `string` \| `null`

###### Tables.chat\_members

> **chat\_members**: `object`

###### Tables.chat\_members.Insert

> **Insert**: `object`

###### Tables.chat\_members.Insert.created\_at?

> `optional` **created\_at?**: `string`

###### Tables.chat\_members.Insert.thread\_id

> **thread\_id**: `string`

###### Tables.chat\_members.Insert.user\_id

> **user\_id**: `string`

###### Tables.chat\_members.Relationships

> **Relationships**: \[\]

###### Tables.chat\_members.Row

> **Row**: `object`

###### Tables.chat\_members.Row.created\_at

> **created\_at**: `string`

###### Tables.chat\_members.Row.thread\_id

> **thread\_id**: `string`

###### Tables.chat\_members.Row.user\_id

> **user\_id**: `string`

###### Tables.chat\_members.Update

> **Update**: `object`

###### Tables.chat\_members.Update.created\_at?

> `optional` **created\_at?**: `string`

###### Tables.chat\_members.Update.thread\_id?

> `optional` **thread\_id?**: `string`

###### Tables.chat\_members.Update.user\_id?

> `optional` **user\_id?**: `string`

###### Tables.chat\_threads

> **chat\_threads**: `object`

###### Tables.chat\_threads.Insert

> **Insert**: `object`

###### Tables.chat\_threads.Insert.company\_id

> **company\_id**: `string`

###### Tables.chat\_threads.Insert.created\_at?

> `optional` **created\_at?**: `string`

###### Tables.chat\_threads.Insert.created\_by?

> `optional` **created\_by?**: `string`

###### Tables.chat\_threads.Insert.id?

> `optional` **id?**: `string`

###### Tables.chat\_threads.Insert.name

> **name**: `string`

###### Tables.chat\_threads.Relationships

> **Relationships**: \[\]

###### Tables.chat\_threads.Row

> **Row**: `object`

###### Tables.chat\_threads.Row.company\_id

> **company\_id**: `string`

###### Tables.chat\_threads.Row.created\_at

> **created\_at**: `string`

###### Tables.chat\_threads.Row.created\_by

> **created\_by**: `string`

###### Tables.chat\_threads.Row.id

> **id**: `string`

###### Tables.chat\_threads.Row.name

> **name**: `string`

###### Tables.chat\_threads.Update

> **Update**: `object`

###### Tables.chat\_threads.Update.company\_id?

> `optional` **company\_id?**: `string`

###### Tables.chat\_threads.Update.created\_at?

> `optional` **created\_at?**: `string`

###### Tables.chat\_threads.Update.created\_by?

> `optional` **created\_by?**: `string`

###### Tables.chat\_threads.Update.id?

> `optional` **id?**: `string`

###### Tables.chat\_threads.Update.name?

> `optional` **name?**: `string`

###### Tables.checklist\_submissions

> **checklist\_submissions**: `object`

###### Tables.checklist\_submissions.Insert

> **Insert**: `object`

###### Tables.checklist\_submissions.Insert.answers?

> `optional` **answers?**: [`Json`](../api/api/src.md#json)

###### Tables.checklist\_submissions.Insert.company\_id

> **company\_id**: `string`

###### Tables.checklist\_submissions.Insert.created\_at?

> `optional` **created\_at?**: `string`

###### Tables.checklist\_submissions.Insert.driver\_id?

> `optional` **driver\_id?**: `string` \| `null`

###### Tables.checklist\_submissions.Insert.driver\_label?

> `optional` **driver\_label?**: `string`

###### Tables.checklist\_submissions.Insert.driver\_user\_id?

> `optional` **driver\_user\_id?**: `string` \| `null`

###### Tables.checklist\_submissions.Insert.id?

> `optional` **id?**: `string`

###### Tables.checklist\_submissions.Insert.template\_id?

> `optional` **template\_id?**: `string` \| `null`

###### Tables.checklist\_submissions.Insert.template\_name?

> `optional` **template\_name?**: `string`

###### Tables.checklist\_submissions.Insert.vehicle\_id?

> `optional` **vehicle\_id?**: `string` \| `null`

###### Tables.checklist\_submissions.Relationships

> **Relationships**: \[\]

###### Tables.checklist\_submissions.Row

> **Row**: `object`

###### Tables.checklist\_submissions.Row.answers

> **answers**: [`Json`](../api/api/src.md#json)

###### Tables.checklist\_submissions.Row.company\_id

> **company\_id**: `string`

###### Tables.checklist\_submissions.Row.created\_at

> **created\_at**: `string`

###### Tables.checklist\_submissions.Row.driver\_id

> **driver\_id**: `string` \| `null`

###### Tables.checklist\_submissions.Row.driver\_label

> **driver\_label**: `string`

###### Tables.checklist\_submissions.Row.driver\_user\_id

> **driver\_user\_id**: `string` \| `null`

###### Tables.checklist\_submissions.Row.id

> **id**: `string`

###### Tables.checklist\_submissions.Row.template\_id

> **template\_id**: `string` \| `null`

###### Tables.checklist\_submissions.Row.template\_name

> **template\_name**: `string`

###### Tables.checklist\_submissions.Row.vehicle\_id

> **vehicle\_id**: `string` \| `null`

###### Tables.checklist\_submissions.Update

> **Update**: `object`

###### Tables.checklist\_submissions.Update.answers?

> `optional` **answers?**: [`Json`](../api/api/src.md#json)

###### Tables.checklist\_submissions.Update.company\_id?

> `optional` **company\_id?**: `string`

###### Tables.checklist\_submissions.Update.created\_at?

> `optional` **created\_at?**: `string`

###### Tables.checklist\_submissions.Update.driver\_id?

> `optional` **driver\_id?**: `string` \| `null`

###### Tables.checklist\_submissions.Update.driver\_label?

> `optional` **driver\_label?**: `string`

###### Tables.checklist\_submissions.Update.driver\_user\_id?

> `optional` **driver\_user\_id?**: `string` \| `null`

###### Tables.checklist\_submissions.Update.id?

> `optional` **id?**: `string`

###### Tables.checklist\_submissions.Update.template\_id?

> `optional` **template\_id?**: `string` \| `null`

###### Tables.checklist\_submissions.Update.template\_name?

> `optional` **template\_name?**: `string`

###### Tables.checklist\_submissions.Update.vehicle\_id?

> `optional` **vehicle\_id?**: `string` \| `null`

###### Tables.checklist\_templates

> **checklist\_templates**: `object`

###### Tables.checklist\_templates.Insert

> **Insert**: `object`

###### Tables.checklist\_templates.Insert.active?

> `optional` **active?**: `boolean`

###### Tables.checklist\_templates.Insert.assigned\_drivers?

> `optional` **assigned\_drivers?**: `string`[]

###### Tables.checklist\_templates.Insert.company\_id

> **company\_id**: `string`

###### Tables.checklist\_templates.Insert.created\_at?

> `optional` **created\_at?**: `string`

###### Tables.checklist\_templates.Insert.id?

> `optional` **id?**: `string`

###### Tables.checklist\_templates.Insert.items?

> `optional` **items?**: [`Json`](../api/api/src.md#json)

###### Tables.checklist\_templates.Insert.name

> **name**: `string`

###### Tables.checklist\_templates.Insert.updated\_at?

> `optional` **updated\_at?**: `string`

###### Tables.checklist\_templates.Relationships

> **Relationships**: \[\]

###### Tables.checklist\_templates.Row

> **Row**: `object`

###### Tables.checklist\_templates.Row.active

> **active**: `boolean`

###### Tables.checklist\_templates.Row.assigned\_drivers

> **assigned\_drivers**: `string`[]

###### Tables.checklist\_templates.Row.company\_id

> **company\_id**: `string`

###### Tables.checklist\_templates.Row.created\_at

> **created\_at**: `string`

###### Tables.checklist\_templates.Row.id

> **id**: `string`

###### Tables.checklist\_templates.Row.items

> **items**: [`Json`](../api/api/src.md#json)

###### Tables.checklist\_templates.Row.name

> **name**: `string`

###### Tables.checklist\_templates.Row.updated\_at

> **updated\_at**: `string`

###### Tables.checklist\_templates.Update

> **Update**: `object`

###### Tables.checklist\_templates.Update.active?

> `optional` **active?**: `boolean`

###### Tables.checklist\_templates.Update.assigned\_drivers?

> `optional` **assigned\_drivers?**: `string`[]

###### Tables.checklist\_templates.Update.company\_id?

> `optional` **company\_id?**: `string`

###### Tables.checklist\_templates.Update.created\_at?

> `optional` **created\_at?**: `string`

###### Tables.checklist\_templates.Update.id?

> `optional` **id?**: `string`

###### Tables.checklist\_templates.Update.items?

> `optional` **items?**: [`Json`](../api/api/src.md#json)

###### Tables.checklist\_templates.Update.name?

> `optional` **name?**: `string`

###### Tables.checklist\_templates.Update.updated\_at?

> `optional` **updated\_at?**: `string`

###### Tables.companies

> **companies**: `object`

###### Tables.companies.Insert

> **Insert**: `object`

###### Tables.companies.Insert.address?

> `optional` **address?**: `string` \| `null`

###### Tables.companies.Insert.bank\_account?

> `optional` **bank\_account?**: `string` \| `null`

###### Tables.companies.Insert.bank\_name?

> `optional` **bank\_name?**: `string` \| `null`

###### Tables.companies.Insert.country?

> `optional` **country?**: `string` \| `null`

###### Tables.companies.Insert.created\_at?

> `optional` **created\_at?**: `string`

###### Tables.companies.Insert.default\_vat\_rate?

> `optional` **default\_vat\_rate?**: `number`

###### Tables.companies.Insert.id?

> `optional` **id?**: `string`

###### Tables.companies.Insert.name

> **name**: `string`

###### Tables.companies.Insert.notify\_days\_ahead?

> `optional` **notify\_days\_ahead?**: `number`

###### Tables.companies.Insert.payment\_due\_days?

> `optional` **payment\_due\_days?**: `number`

###### Tables.companies.Insert.tax\_id?

> `optional` **tax\_id?**: `string` \| `null`

###### Tables.companies.Insert.updated\_at?

> `optional` **updated\_at?**: `string`

###### Tables.companies.Relationships

> **Relationships**: \[\]

###### Tables.companies.Row

> **Row**: `object`

###### Tables.companies.Row.address

> **address**: `string` \| `null`

###### Tables.companies.Row.bank\_account

> **bank\_account**: `string` \| `null`

###### Tables.companies.Row.bank\_name

> **bank\_name**: `string` \| `null`

###### Tables.companies.Row.country

> **country**: `string` \| `null`

###### Tables.companies.Row.created\_at

> **created\_at**: `string`

###### Tables.companies.Row.default\_vat\_rate

> **default\_vat\_rate**: `number`

###### Tables.companies.Row.id

> **id**: `string`

###### Tables.companies.Row.name

> **name**: `string`

###### Tables.companies.Row.notify\_days\_ahead

> **notify\_days\_ahead**: `number`

###### Tables.companies.Row.payment\_due\_days

> **payment\_due\_days**: `number`

###### Tables.companies.Row.tax\_id

> **tax\_id**: `string` \| `null`

###### Tables.companies.Row.updated\_at

> **updated\_at**: `string`

###### Tables.companies.Update

> **Update**: `object`

###### Tables.companies.Update.address?

> `optional` **address?**: `string` \| `null`

###### Tables.companies.Update.bank\_account?

> `optional` **bank\_account?**: `string` \| `null`

###### Tables.companies.Update.bank\_name?

> `optional` **bank\_name?**: `string` \| `null`

###### Tables.companies.Update.country?

> `optional` **country?**: `string` \| `null`

###### Tables.companies.Update.created\_at?

> `optional` **created\_at?**: `string`

###### Tables.companies.Update.default\_vat\_rate?

> `optional` **default\_vat\_rate?**: `number`

###### Tables.companies.Update.id?

> `optional` **id?**: `string`

###### Tables.companies.Update.name?

> `optional` **name?**: `string`

###### Tables.companies.Update.notify\_days\_ahead?

> `optional` **notify\_days\_ahead?**: `number`

###### Tables.companies.Update.payment\_due\_days?

> `optional` **payment\_due\_days?**: `number`

###### Tables.companies.Update.tax\_id?

> `optional` **tax\_id?**: `string` \| `null`

###### Tables.companies.Update.updated\_at?

> `optional` **updated\_at?**: `string`

###### Tables.company\_settlement\_settings

> **company\_settlement\_settings**: `object`

###### Tables.company\_settlement\_settings.Insert

> **Insert**: `object`

###### Tables.company\_settlement\_settings.Insert.company\_id

> **company\_id**: `string`

###### Tables.company\_settlement\_settings.Insert.daily\_rate?

> `optional` **daily\_rate?**: `number`

###### Tables.company\_settlement\_settings.Insert.doc\_bonus\_monthly?

> `optional` **doc\_bonus\_monthly?**: `number`

###### Tables.company\_settlement\_settings.Insert.insurance\_per\_day?

> `optional` **insurance\_per\_day?**: `number`

###### Tables.company\_settlement\_settings.Insert.km\_norm\_per\_day?

> `optional` **km\_norm\_per\_day?**: `number`

###### Tables.company\_settlement\_settings.Insert.km\_rate?

> `optional` **km\_rate?**: `number`

###### Tables.company\_settlement\_settings.Insert.phone\_monthly?

> `optional` **phone\_monthly?**: `number`

###### Tables.company\_settlement\_settings.Insert.updated\_at?

> `optional` **updated\_at?**: `string`

###### Tables.company\_settlement\_settings.Relationships

> **Relationships**: \[\]

###### Tables.company\_settlement\_settings.Row

> **Row**: `object`

###### Tables.company\_settlement\_settings.Row.company\_id

> **company\_id**: `string`

###### Tables.company\_settlement\_settings.Row.daily\_rate

> **daily\_rate**: `number`

###### Tables.company\_settlement\_settings.Row.doc\_bonus\_monthly

> **doc\_bonus\_monthly**: `number`

###### Tables.company\_settlement\_settings.Row.insurance\_per\_day

> **insurance\_per\_day**: `number`

###### Tables.company\_settlement\_settings.Row.km\_norm\_per\_day

> **km\_norm\_per\_day**: `number`

###### Tables.company\_settlement\_settings.Row.km\_rate

> **km\_rate**: `number`

###### Tables.company\_settlement\_settings.Row.phone\_monthly

> **phone\_monthly**: `number`

###### Tables.company\_settlement\_settings.Row.updated\_at

> **updated\_at**: `string`

###### Tables.company\_settlement\_settings.Update

> **Update**: `object`

###### Tables.company\_settlement\_settings.Update.company\_id?

> `optional` **company\_id?**: `string`

###### Tables.company\_settlement\_settings.Update.daily\_rate?

> `optional` **daily\_rate?**: `number`

###### Tables.company\_settlement\_settings.Update.doc\_bonus\_monthly?

> `optional` **doc\_bonus\_monthly?**: `number`

###### Tables.company\_settlement\_settings.Update.insurance\_per\_day?

> `optional` **insurance\_per\_day?**: `number`

###### Tables.company\_settlement\_settings.Update.km\_norm\_per\_day?

> `optional` **km\_norm\_per\_day?**: `number`

###### Tables.company\_settlement\_settings.Update.km\_rate?

> `optional` **km\_rate?**: `number`

###### Tables.company\_settlement\_settings.Update.phone\_monthly?

> `optional` **phone\_monthly?**: `number`

###### Tables.company\_settlement\_settings.Update.updated\_at?

> `optional` **updated\_at?**: `string`

###### Tables.contractors

> **contractors**: `object`

###### Tables.contractors.Insert

> **Insert**: `object`

###### Tables.contractors.Insert.address?

> `optional` **address?**: `string` \| `null`

###### Tables.contractors.Insert.company\_id

> **company\_id**: `string`

###### Tables.contractors.Insert.country?

> `optional` **country?**: `string` \| `null`

###### Tables.contractors.Insert.created\_at?

> `optional` **created\_at?**: `string`

###### Tables.contractors.Insert.id?

> `optional` **id?**: `string`

###### Tables.contractors.Insert.name

> **name**: `string`

###### Tables.contractors.Insert.tax\_id?

> `optional` **tax\_id?**: `string` \| `null`

###### Tables.contractors.Relationships

> **Relationships**: \[\]

###### Tables.contractors.Row

> **Row**: `object`

###### Tables.contractors.Row.address

> **address**: `string` \| `null`

###### Tables.contractors.Row.company\_id

> **company\_id**: `string`

###### Tables.contractors.Row.country

> **country**: `string` \| `null`

###### Tables.contractors.Row.created\_at

> **created\_at**: `string`

###### Tables.contractors.Row.id

> **id**: `string`

###### Tables.contractors.Row.name

> **name**: `string`

###### Tables.contractors.Row.tax\_id

> **tax\_id**: `string` \| `null`

###### Tables.contractors.Update

> **Update**: `object`

###### Tables.contractors.Update.address?

> `optional` **address?**: `string` \| `null`

###### Tables.contractors.Update.company\_id?

> `optional` **company\_id?**: `string`

###### Tables.contractors.Update.country?

> `optional` **country?**: `string` \| `null`

###### Tables.contractors.Update.created\_at?

> `optional` **created\_at?**: `string`

###### Tables.contractors.Update.id?

> `optional` **id?**: `string`

###### Tables.contractors.Update.name?

> `optional` **name?**: `string`

###### Tables.contractors.Update.tax\_id?

> `optional` **tax\_id?**: `string` \| `null`

###### Tables.damage\_claims

> **damage\_claims**: `object`

###### Tables.damage\_claims.Insert

> **Insert**: `object`

###### Tables.damage\_claims.Insert.claim\_date?

> `optional` **claim\_date?**: `string`

###### Tables.damage\_claims.Insert.claim\_number?

> `optional` **claim\_number?**: `string` \| `null`

###### Tables.damage\_claims.Insert.company\_id

> **company\_id**: `string`

###### Tables.damage\_claims.Insert.cost?

> `optional` **cost?**: `number` \| `null`

###### Tables.damage\_claims.Insert.created\_at?

> `optional` **created\_at?**: `string`

###### Tables.damage\_claims.Insert.created\_by?

> `optional` **created\_by?**: `string` \| `null`

###### Tables.damage\_claims.Insert.currency?

> `optional` **currency?**: `string`

###### Tables.damage\_claims.Insert.description?

> `optional` **description?**: `string` \| `null`

###### Tables.damage\_claims.Insert.driver\_name?

> `optional` **driver\_name?**: `string` \| `null`

###### Tables.damage\_claims.Insert.id?

> `optional` **id?**: `string`

###### Tables.damage\_claims.Insert.insurer?

> `optional` **insurer?**: `string` \| `null`

###### Tables.damage\_claims.Insert.kind?

> `optional` **kind?**: `string`

###### Tables.damage\_claims.Insert.note?

> `optional` **note?**: `string` \| `null`

###### Tables.damage\_claims.Insert.status?

> `optional` **status?**: `string`

###### Tables.damage\_claims.Insert.vehicle\_id?

> `optional` **vehicle\_id?**: `string` \| `null`

###### Tables.damage\_claims.Relationships

> **Relationships**: \[\]

###### Tables.damage\_claims.Row

> **Row**: `object`

###### Tables.damage\_claims.Row.claim\_date

> **claim\_date**: `string`

###### Tables.damage\_claims.Row.claim\_number

> **claim\_number**: `string` \| `null`

###### Tables.damage\_claims.Row.company\_id

> **company\_id**: `string`

###### Tables.damage\_claims.Row.cost

> **cost**: `number` \| `null`

###### Tables.damage\_claims.Row.created\_at

> **created\_at**: `string`

###### Tables.damage\_claims.Row.created\_by

> **created\_by**: `string` \| `null`

###### Tables.damage\_claims.Row.currency

> **currency**: `string`

###### Tables.damage\_claims.Row.description

> **description**: `string` \| `null`

###### Tables.damage\_claims.Row.driver\_name

> **driver\_name**: `string` \| `null`

###### Tables.damage\_claims.Row.id

> **id**: `string`

###### Tables.damage\_claims.Row.insurer

> **insurer**: `string` \| `null`

###### Tables.damage\_claims.Row.kind

> **kind**: `string`

###### Tables.damage\_claims.Row.note

> **note**: `string` \| `null`

###### Tables.damage\_claims.Row.status

> **status**: `string`

###### Tables.damage\_claims.Row.vehicle\_id

> **vehicle\_id**: `string` \| `null`

###### Tables.damage\_claims.Update

> **Update**: `object`

###### Tables.damage\_claims.Update.claim\_date?

> `optional` **claim\_date?**: `string`

###### Tables.damage\_claims.Update.claim\_number?

> `optional` **claim\_number?**: `string` \| `null`

###### Tables.damage\_claims.Update.company\_id?

> `optional` **company\_id?**: `string`

###### Tables.damage\_claims.Update.cost?

> `optional` **cost?**: `number` \| `null`

###### Tables.damage\_claims.Update.created\_at?

> `optional` **created\_at?**: `string`

###### Tables.damage\_claims.Update.created\_by?

> `optional` **created\_by?**: `string` \| `null`

###### Tables.damage\_claims.Update.currency?

> `optional` **currency?**: `string`

###### Tables.damage\_claims.Update.description?

> `optional` **description?**: `string` \| `null`

###### Tables.damage\_claims.Update.driver\_name?

> `optional` **driver\_name?**: `string` \| `null`

###### Tables.damage\_claims.Update.id?

> `optional` **id?**: `string`

###### Tables.damage\_claims.Update.insurer?

> `optional` **insurer?**: `string` \| `null`

###### Tables.damage\_claims.Update.kind?

> `optional` **kind?**: `string`

###### Tables.damage\_claims.Update.note?

> `optional` **note?**: `string` \| `null`

###### Tables.damage\_claims.Update.status?

> `optional` **status?**: `string`

###### Tables.damage\_claims.Update.vehicle\_id?

> `optional` **vehicle\_id?**: `string` \| `null`

###### Tables.documents

> **documents**: `object`

###### Tables.documents.Insert

> **Insert**: `object`

###### Tables.documents.Insert.allowed\_user\_ids?

> `optional` **allowed\_user\_ids?**: `string`[]

###### Tables.documents.Insert.category?

> `optional` **category?**: `string` \| `null`

###### Tables.documents.Insert.company\_id

> **company\_id**: `string`

###### Tables.documents.Insert.created\_at?

> `optional` **created\_at?**: `string`

###### Tables.documents.Insert.expiry\_date?

> `optional` **expiry\_date?**: `string` \| `null`

###### Tables.documents.Insert.id?

> `optional` **id?**: `string`

###### Tables.documents.Insert.mime?

> `optional` **mime?**: `string` \| `null`

###### Tables.documents.Insert.name

> **name**: `string`

###### Tables.documents.Insert.path

> **path**: `string`

###### Tables.documents.Insert.size\_bytes?

> `optional` **size\_bytes?**: `number` \| `null`

###### Tables.documents.Insert.uploaded\_by?

> `optional` **uploaded\_by?**: `string` \| `null`

###### Tables.documents.Insert.vehicle\_id?

> `optional` **vehicle\_id?**: `string` \| `null`

###### Tables.documents.Insert.visibility?

> `optional` **visibility?**: `string`

###### Tables.documents.Relationships

> **Relationships**: \[\]

###### Tables.documents.Row

> **Row**: `object`

###### Tables.documents.Row.allowed\_user\_ids

> **allowed\_user\_ids**: `string`[]

###### Tables.documents.Row.category

> **category**: `string` \| `null`

###### Tables.documents.Row.company\_id

> **company\_id**: `string`

###### Tables.documents.Row.created\_at

> **created\_at**: `string`

###### Tables.documents.Row.expiry\_date

> **expiry\_date**: `string` \| `null`

###### Tables.documents.Row.id

> **id**: `string`

###### Tables.documents.Row.mime

> **mime**: `string` \| `null`

###### Tables.documents.Row.name

> **name**: `string`

###### Tables.documents.Row.path

> **path**: `string`

###### Tables.documents.Row.size\_bytes

> **size\_bytes**: `number` \| `null`

###### Tables.documents.Row.uploaded\_by

> **uploaded\_by**: `string` \| `null`

###### Tables.documents.Row.vehicle\_id

> **vehicle\_id**: `string` \| `null`

###### Tables.documents.Row.visibility

> **visibility**: `string`

###### Tables.documents.Update

> **Update**: `object`

###### Tables.documents.Update.allowed\_user\_ids?

> `optional` **allowed\_user\_ids?**: `string`[]

###### Tables.documents.Update.category?

> `optional` **category?**: `string` \| `null`

###### Tables.documents.Update.company\_id?

> `optional` **company\_id?**: `string`

###### Tables.documents.Update.created\_at?

> `optional` **created\_at?**: `string`

###### Tables.documents.Update.expiry\_date?

> `optional` **expiry\_date?**: `string` \| `null`

###### Tables.documents.Update.id?

> `optional` **id?**: `string`

###### Tables.documents.Update.mime?

> `optional` **mime?**: `string` \| `null`

###### Tables.documents.Update.name?

> `optional` **name?**: `string`

###### Tables.documents.Update.path?

> `optional` **path?**: `string`

###### Tables.documents.Update.size\_bytes?

> `optional` **size\_bytes?**: `number` \| `null`

###### Tables.documents.Update.uploaded\_by?

> `optional` **uploaded\_by?**: `string` \| `null`

###### Tables.documents.Update.vehicle\_id?

> `optional` **vehicle\_id?**: `string` \| `null`

###### Tables.documents.Update.visibility?

> `optional` **visibility?**: `string`

###### Tables.driver\_assignments

> **driver\_assignments**: `object`

###### Tables.driver\_assignments.Insert

> **Insert**: `object`

###### Tables.driver\_assignments.Insert.active?

> `optional` **active?**: `boolean`

###### Tables.driver\_assignments.Insert.id?

> `optional` **id?**: `string`

###### Tables.driver\_assignments.Insert.user\_id

> **user\_id**: `string`

###### Tables.driver\_assignments.Insert.valid\_from?

> `optional` **valid\_from?**: `string` \| `null`

###### Tables.driver\_assignments.Insert.valid\_to?

> `optional` **valid\_to?**: `string` \| `null`

###### Tables.driver\_assignments.Insert.vehicle\_id

> **vehicle\_id**: `string`

###### Tables.driver\_assignments.Relationships

> **Relationships**: \[\]

###### Tables.driver\_assignments.Row

> **Row**: `object`

###### Tables.driver\_assignments.Row.active

> **active**: `boolean`

###### Tables.driver\_assignments.Row.id

> **id**: `string`

###### Tables.driver\_assignments.Row.user\_id

> **user\_id**: `string`

###### Tables.driver\_assignments.Row.valid\_from

> **valid\_from**: `string` \| `null`

###### Tables.driver\_assignments.Row.valid\_to

> **valid\_to**: `string` \| `null`

###### Tables.driver\_assignments.Row.vehicle\_id

> **vehicle\_id**: `string`

###### Tables.driver\_assignments.Update

> **Update**: `object`

###### Tables.driver\_assignments.Update.active?

> `optional` **active?**: `boolean`

###### Tables.driver\_assignments.Update.id?

> `optional` **id?**: `string`

###### Tables.driver\_assignments.Update.user\_id?

> `optional` **user\_id?**: `string`

###### Tables.driver\_assignments.Update.valid\_from?

> `optional` **valid\_from?**: `string` \| `null`

###### Tables.driver\_assignments.Update.valid\_to?

> `optional` **valid\_to?**: `string` \| `null`

###### Tables.driver\_assignments.Update.vehicle\_id?

> `optional` **vehicle\_id?**: `string`

###### Tables.driver\_expenses

> **driver\_expenses**: `object`

###### Tables.driver\_expenses.Insert

> **Insert**: `object`

###### Tables.driver\_expenses.Insert.amount

> **amount**: `number`

###### Tables.driver\_expenses.Insert.category

> **category**: `string`

###### Tables.driver\_expenses.Insert.company\_id

> **company\_id**: `string`

###### Tables.driver\_expenses.Insert.created\_at?

> `optional` **created\_at?**: `string`

###### Tables.driver\_expenses.Insert.currency?

> `optional` **currency?**: `string`

###### Tables.driver\_expenses.Insert.expense\_date?

> `optional` **expense\_date?**: `string`

###### Tables.driver\_expenses.Insert.id?

> `optional` **id?**: `string`

###### Tables.driver\_expenses.Insert.note?

> `optional` **note?**: `string` \| `null`

###### Tables.driver\_expenses.Insert.photo\_path?

> `optional` **photo\_path?**: `string` \| `null`

###### Tables.driver\_expenses.Insert.status?

> `optional` **status?**: `string`

###### Tables.driver\_expenses.Insert.user\_id?

> `optional` **user\_id?**: `string`

###### Tables.driver\_expenses.Insert.vehicle\_id?

> `optional` **vehicle\_id?**: `string` \| `null`

###### Tables.driver\_expenses.Relationships

> **Relationships**: \[\]

###### Tables.driver\_expenses.Row

> **Row**: `object`

###### Tables.driver\_expenses.Row.amount

> **amount**: `number`

###### Tables.driver\_expenses.Row.category

> **category**: `string`

###### Tables.driver\_expenses.Row.company\_id

> **company\_id**: `string`

###### Tables.driver\_expenses.Row.created\_at

> **created\_at**: `string`

###### Tables.driver\_expenses.Row.currency

> **currency**: `string`

###### Tables.driver\_expenses.Row.expense\_date

> **expense\_date**: `string`

###### Tables.driver\_expenses.Row.id

> **id**: `string`

###### Tables.driver\_expenses.Row.note

> **note**: `string` \| `null`

###### Tables.driver\_expenses.Row.photo\_path

> **photo\_path**: `string` \| `null`

###### Tables.driver\_expenses.Row.status

> **status**: `string`

###### Tables.driver\_expenses.Row.user\_id

> **user\_id**: `string`

###### Tables.driver\_expenses.Row.vehicle\_id

> **vehicle\_id**: `string` \| `null`

###### Tables.driver\_expenses.Update

> **Update**: `object`

###### Tables.driver\_expenses.Update.amount?

> `optional` **amount?**: `number`

###### Tables.driver\_expenses.Update.category?

> `optional` **category?**: `string`

###### Tables.driver\_expenses.Update.company\_id?

> `optional` **company\_id?**: `string`

###### Tables.driver\_expenses.Update.created\_at?

> `optional` **created\_at?**: `string`

###### Tables.driver\_expenses.Update.currency?

> `optional` **currency?**: `string`

###### Tables.driver\_expenses.Update.expense\_date?

> `optional` **expense\_date?**: `string`

###### Tables.driver\_expenses.Update.id?

> `optional` **id?**: `string`

###### Tables.driver\_expenses.Update.note?

> `optional` **note?**: `string` \| `null`

###### Tables.driver\_expenses.Update.photo\_path?

> `optional` **photo\_path?**: `string` \| `null`

###### Tables.driver\_expenses.Update.status?

> `optional` **status?**: `string`

###### Tables.driver\_expenses.Update.user\_id?

> `optional` **user\_id?**: `string`

###### Tables.driver\_expenses.Update.vehicle\_id?

> `optional` **vehicle\_id?**: `string` \| `null`

###### Tables.driver\_payouts

> **driver\_payouts**: `object`

###### Tables.driver\_payouts.Insert

> **Insert**: `object`

###### Tables.driver\_payouts.Insert.amount

> **amount**: `number`

###### Tables.driver\_payouts.Insert.company\_id

> **company\_id**: `string`

###### Tables.driver\_payouts.Insert.created\_at?

> `optional` **created\_at?**: `string`

###### Tables.driver\_payouts.Insert.created\_by?

> `optional` **created\_by?**: `string` \| `null`

###### Tables.driver\_payouts.Insert.currency?

> `optional` **currency?**: `string`

###### Tables.driver\_payouts.Insert.driver\_id?

> `optional` **driver\_id?**: `string` \| `null`

###### Tables.driver\_payouts.Insert.driver\_name?

> `optional` **driver\_name?**: `string` \| `null`

###### Tables.driver\_payouts.Insert.entry\_date?

> `optional` **entry\_date?**: `string`

###### Tables.driver\_payouts.Insert.id?

> `optional` **id?**: `string`

###### Tables.driver\_payouts.Insert.kind

> **kind**: `string`

###### Tables.driver\_payouts.Insert.note?

> `optional` **note?**: `string` \| `null`

###### Tables.driver\_payouts.Relationships

> **Relationships**: \[\]

###### Tables.driver\_payouts.Row

> **Row**: `object`

###### Tables.driver\_payouts.Row.amount

> **amount**: `number`

###### Tables.driver\_payouts.Row.company\_id

> **company\_id**: `string`

###### Tables.driver\_payouts.Row.created\_at

> **created\_at**: `string`

###### Tables.driver\_payouts.Row.created\_by

> **created\_by**: `string` \| `null`

###### Tables.driver\_payouts.Row.currency

> **currency**: `string`

###### Tables.driver\_payouts.Row.driver\_id

> **driver\_id**: `string` \| `null`

###### Tables.driver\_payouts.Row.driver\_name

> **driver\_name**: `string` \| `null`

###### Tables.driver\_payouts.Row.entry\_date

> **entry\_date**: `string`

###### Tables.driver\_payouts.Row.id

> **id**: `string`

###### Tables.driver\_payouts.Row.kind

> **kind**: `string`

###### Tables.driver\_payouts.Row.note

> **note**: `string` \| `null`

###### Tables.driver\_payouts.Update

> **Update**: `object`

###### Tables.driver\_payouts.Update.amount?

> `optional` **amount?**: `number`

###### Tables.driver\_payouts.Update.company\_id?

> `optional` **company\_id?**: `string`

###### Tables.driver\_payouts.Update.created\_at?

> `optional` **created\_at?**: `string`

###### Tables.driver\_payouts.Update.created\_by?

> `optional` **created\_by?**: `string` \| `null`

###### Tables.driver\_payouts.Update.currency?

> `optional` **currency?**: `string`

###### Tables.driver\_payouts.Update.driver\_id?

> `optional` **driver\_id?**: `string` \| `null`

###### Tables.driver\_payouts.Update.driver\_name?

> `optional` **driver\_name?**: `string` \| `null`

###### Tables.driver\_payouts.Update.entry\_date?

> `optional` **entry\_date?**: `string`

###### Tables.driver\_payouts.Update.id?

> `optional` **id?**: `string`

###### Tables.driver\_payouts.Update.kind?

> `optional` **kind?**: `string`

###### Tables.driver\_payouts.Update.note?

> `optional` **note?**: `string` \| `null`

###### Tables.driver\_positions

> **driver\_positions**: `object`

###### Tables.driver\_positions.Insert

> **Insert**: `object`

###### Tables.driver\_positions.Insert.company\_id

> **company\_id**: `string`

###### Tables.driver\_positions.Insert.heading?

> `optional` **heading?**: `number` \| `null`

###### Tables.driver\_positions.Insert.lat

> **lat**: `number`

###### Tables.driver\_positions.Insert.lng

> **lng**: `number`

###### Tables.driver\_positions.Insert.speed\_kmh?

> `optional` **speed\_kmh?**: `number` \| `null`

###### Tables.driver\_positions.Insert.updated\_at?

> `optional` **updated\_at?**: `string`

###### Tables.driver\_positions.Insert.user\_id

> **user\_id**: `string`

###### Tables.driver\_positions.Relationships

> **Relationships**: \[\]

###### Tables.driver\_positions.Row

> **Row**: `object`

###### Tables.driver\_positions.Row.company\_id

> **company\_id**: `string`

###### Tables.driver\_positions.Row.heading

> **heading**: `number` \| `null`

###### Tables.driver\_positions.Row.lat

> **lat**: `number`

###### Tables.driver\_positions.Row.lng

> **lng**: `number`

###### Tables.driver\_positions.Row.speed\_kmh

> **speed\_kmh**: `number` \| `null`

###### Tables.driver\_positions.Row.updated\_at

> **updated\_at**: `string`

###### Tables.driver\_positions.Row.user\_id

> **user\_id**: `string`

###### Tables.driver\_positions.Update

> **Update**: `object`

###### Tables.driver\_positions.Update.company\_id?

> `optional` **company\_id?**: `string`

###### Tables.driver\_positions.Update.heading?

> `optional` **heading?**: `number` \| `null`

###### Tables.driver\_positions.Update.lat?

> `optional` **lat?**: `number`

###### Tables.driver\_positions.Update.lng?

> `optional` **lng?**: `number`

###### Tables.driver\_positions.Update.speed\_kmh?

> `optional` **speed\_kmh?**: `number` \| `null`

###### Tables.driver\_positions.Update.updated\_at?

> `optional` **updated\_at?**: `string`

###### Tables.driver\_positions.Update.user\_id?

> `optional` **user\_id?**: `string`

###### Tables.driver\_profiles

> **driver\_profiles**: `object`

###### Tables.driver\_profiles.Insert

> **Insert**: `object`

###### Tables.driver\_profiles.Insert.comment?

> `optional` **comment?**: `string` \| `null`

###### Tables.driver\_profiles.Insert.company\_data\_enc?

> `optional` **company\_data\_enc?**: `string` \| `null`

###### Tables.driver\_profiles.Insert.company\_name?

> `optional` **company\_name?**: `string` \| `null`

###### Tables.driver\_profiles.Insert.email\_enc?

> `optional` **email\_enc?**: `string` \| `null`

###### Tables.driver\_profiles.Insert.phone\_enc?

> `optional` **phone\_enc?**: `string` \| `null`

###### Tables.driver\_profiles.Insert.qualifications?

> `optional` **qualifications?**: [`Json`](../api/api/src.md#json)

###### Tables.driver\_profiles.Insert.user\_id

> **user\_id**: `string`

###### Tables.driver\_profiles.Relationships

> **Relationships**: \[\]

###### Tables.driver\_profiles.Row

> **Row**: `object`

###### Tables.driver\_profiles.Row.comment

> **comment**: `string` \| `null`

###### Tables.driver\_profiles.Row.company\_data\_enc

> **company\_data\_enc**: `string` \| `null`

###### Tables.driver\_profiles.Row.company\_name

> **company\_name**: `string` \| `null`

###### Tables.driver\_profiles.Row.email\_enc

> **email\_enc**: `string` \| `null`

###### Tables.driver\_profiles.Row.phone\_enc

> **phone\_enc**: `string` \| `null`

###### Tables.driver\_profiles.Row.qualifications

> **qualifications**: [`Json`](../api/api/src.md#json)

###### Tables.driver\_profiles.Row.user\_id

> **user\_id**: `string`

###### Tables.driver\_profiles.Update

> **Update**: `object`

###### Tables.driver\_profiles.Update.comment?

> `optional` **comment?**: `string` \| `null`

###### Tables.driver\_profiles.Update.company\_data\_enc?

> `optional` **company\_data\_enc?**: `string` \| `null`

###### Tables.driver\_profiles.Update.company\_name?

> `optional` **company\_name?**: `string` \| `null`

###### Tables.driver\_profiles.Update.email\_enc?

> `optional` **email\_enc?**: `string` \| `null`

###### Tables.driver\_profiles.Update.phone\_enc?

> `optional` **phone\_enc?**: `string` \| `null`

###### Tables.driver\_profiles.Update.qualifications?

> `optional` **qualifications?**: [`Json`](../api/api/src.md#json)

###### Tables.driver\_profiles.Update.user\_id?

> `optional` **user\_id?**: `string`

###### Tables.driver\_routes

> **driver\_routes**: `object`

###### Tables.driver\_routes.Insert

> **Insert**: `object`

###### Tables.driver\_routes.Insert.company\_id

> **company\_id**: `string`

###### Tables.driver\_routes.Insert.created\_at?

> `optional` **created\_at?**: `string`

###### Tables.driver\_routes.Insert.created\_by?

> `optional` **created\_by?**: `string` \| `null`

###### Tables.driver\_routes.Insert.driver\_id

> **driver\_id**: `string`

###### Tables.driver\_routes.Insert.driver\_user\_id?

> `optional` **driver\_user\_id?**: `string` \| `null`

###### Tables.driver\_routes.Insert.geometry?

> `optional` **geometry?**: [`Json`](../api/api/src.md#json)

###### Tables.driver\_routes.Insert.id?

> `optional` **id?**: `string`

###### Tables.driver\_routes.Insert.name?

> `optional` **name?**: `string`

###### Tables.driver\_routes.Insert.stops?

> `optional` **stops?**: [`Json`](../api/api/src.md#json)

###### Tables.driver\_routes.Insert.summary?

> `optional` **summary?**: [`Json`](../api/api/src.md#json)

###### Tables.driver\_routes.Relationships

> **Relationships**: \[\]

###### Tables.driver\_routes.Row

> **Row**: `object`

###### Tables.driver\_routes.Row.company\_id

> **company\_id**: `string`

###### Tables.driver\_routes.Row.created\_at

> **created\_at**: `string`

###### Tables.driver\_routes.Row.created\_by

> **created\_by**: `string` \| `null`

###### Tables.driver\_routes.Row.driver\_id

> **driver\_id**: `string`

###### Tables.driver\_routes.Row.driver\_user\_id

> **driver\_user\_id**: `string` \| `null`

###### Tables.driver\_routes.Row.geometry

> **geometry**: [`Json`](../api/api/src.md#json)

###### Tables.driver\_routes.Row.id

> **id**: `string`

###### Tables.driver\_routes.Row.name

> **name**: `string`

###### Tables.driver\_routes.Row.stops

> **stops**: [`Json`](../api/api/src.md#json)

###### Tables.driver\_routes.Row.summary

> **summary**: [`Json`](../api/api/src.md#json)

###### Tables.driver\_routes.Update

> **Update**: `object`

###### Tables.driver\_routes.Update.company\_id?

> `optional` **company\_id?**: `string`

###### Tables.driver\_routes.Update.created\_at?

> `optional` **created\_at?**: `string`

###### Tables.driver\_routes.Update.created\_by?

> `optional` **created\_by?**: `string` \| `null`

###### Tables.driver\_routes.Update.driver\_id?

> `optional` **driver\_id?**: `string`

###### Tables.driver\_routes.Update.driver\_user\_id?

> `optional` **driver\_user\_id?**: `string` \| `null`

###### Tables.driver\_routes.Update.geometry?

> `optional` **geometry?**: [`Json`](../api/api/src.md#json)

###### Tables.driver\_routes.Update.id?

> `optional` **id?**: `string`

###### Tables.driver\_routes.Update.name?

> `optional` **name?**: `string`

###### Tables.driver\_routes.Update.stops?

> `optional` **stops?**: [`Json`](../api/api/src.md#json)

###### Tables.driver\_routes.Update.summary?

> `optional` **summary?**: [`Json`](../api/api/src.md#json)

###### Tables.driver\_tacho\_events

> **driver\_tacho\_events**: `object`

###### Tables.driver\_tacho\_events.Insert

> **Insert**: `object`

###### Tables.driver\_tacho\_events.Insert.at?

> `optional` **at?**: `string`

###### Tables.driver\_tacho\_events.Insert.company\_id

> **company\_id**: `string`

###### Tables.driver\_tacho\_events.Insert.created\_at?

> `optional` **created\_at?**: `string`

###### Tables.driver\_tacho\_events.Insert.driver\_user\_id

> **driver\_user\_id**: `string`

###### Tables.driver\_tacho\_events.Insert.id?

> `optional` **id?**: `string`

###### Tables.driver\_tacho\_events.Insert.kind

> **kind**: `string`

###### Tables.driver\_tacho\_events.Insert.note?

> `optional` **note?**: `string` \| `null`

###### Tables.driver\_tacho\_events.Insert.rest\_type?

> `optional` **rest\_type?**: `string` \| `null`

###### Tables.driver\_tacho\_events.Relationships

> **Relationships**: \[\]

###### Tables.driver\_tacho\_events.Row

> **Row**: `object`

###### Tables.driver\_tacho\_events.Row.at

> **at**: `string`

###### Tables.driver\_tacho\_events.Row.company\_id

> **company\_id**: `string`

###### Tables.driver\_tacho\_events.Row.created\_at

> **created\_at**: `string`

###### Tables.driver\_tacho\_events.Row.driver\_user\_id

> **driver\_user\_id**: `string`

###### Tables.driver\_tacho\_events.Row.id

> **id**: `string`

###### Tables.driver\_tacho\_events.Row.kind

> **kind**: `string`

###### Tables.driver\_tacho\_events.Row.note

> **note**: `string` \| `null`

###### Tables.driver\_tacho\_events.Row.rest\_type

> **rest\_type**: `string` \| `null`

###### Tables.driver\_tacho\_events.Update

> **Update**: `object`

###### Tables.driver\_tacho\_events.Update.at?

> `optional` **at?**: `string`

###### Tables.driver\_tacho\_events.Update.company\_id?

> `optional` **company\_id?**: `string`

###### Tables.driver\_tacho\_events.Update.created\_at?

> `optional` **created\_at?**: `string`

###### Tables.driver\_tacho\_events.Update.driver\_user\_id?

> `optional` **driver\_user\_id?**: `string`

###### Tables.driver\_tacho\_events.Update.id?

> `optional` **id?**: `string`

###### Tables.driver\_tacho\_events.Update.kind?

> `optional` **kind?**: `string`

###### Tables.driver\_tacho\_events.Update.note?

> `optional` **note?**: `string` \| `null`

###### Tables.driver\_tacho\_events.Update.rest\_type?

> `optional` **rest\_type?**: `string` \| `null`

###### Tables.drivers

> **drivers**: `object`

###### Tables.drivers.Insert

> **Insert**: `object`

###### Tables.drivers.Insert.adr\_expiry?

> `optional` **adr\_expiry?**: `string` \| `null`

###### Tables.drivers.Insert.birth\_date\_enc?

> `optional` **birth\_date\_enc?**: `string` \| `null`

###### Tables.drivers.Insert.code95\_expiry?

> `optional` **code95\_expiry?**: `string` \| `null`

###### Tables.drivers.Insert.company\_id

> **company\_id**: `string`

###### Tables.drivers.Insert.created\_at?

> `optional` **created\_at?**: `string`

###### Tables.drivers.Insert.first\_name\_enc?

> `optional` **first\_name\_enc?**: `string` \| `null`

###### Tables.drivers.Insert.id?

> `optional` **id?**: `string`

###### Tables.drivers.Insert.id\_card\_enc?

> `optional` **id\_card\_enc?**: `string` \| `null`

###### Tables.drivers.Insert.id\_card\_expiry?

> `optional` **id\_card\_expiry?**: `string` \| `null`

###### Tables.drivers.Insert.last\_name\_enc?

> `optional` **last\_name\_enc?**: `string` \| `null`

###### Tables.drivers.Insert.license\_categories?

> `optional` **license\_categories?**: `string`[]

###### Tables.drivers.Insert.license\_enc?

> `optional` **license\_enc?**: `string` \| `null`

###### Tables.drivers.Insert.license\_expiry?

> `optional` **license\_expiry?**: `string` \| `null`

###### Tables.drivers.Insert.medical\_expiry?

> `optional` **medical\_expiry?**: `string` \| `null`

###### Tables.drivers.Insert.notes?

> `optional` **notes?**: `string` \| `null`

###### Tables.drivers.Insert.passport\_enc?

> `optional` **passport\_enc?**: `string` \| `null`

###### Tables.drivers.Insert.passport\_expiry?

> `optional` **passport\_expiry?**: `string` \| `null`

###### Tables.drivers.Insert.psychotech\_expiry?

> `optional` **psychotech\_expiry?**: `string` \| `null`

###### Tables.drivers.Insert.qualification\_details?

> `optional` **qualification\_details?**: [`Json`](../api/api/src.md#json)

###### Tables.drivers.Insert.qualifications?

> `optional` **qualifications?**: `string`[]

###### Tables.drivers.Insert.updated\_at?

> `optional` **updated\_at?**: `string`

###### Tables.drivers.Insert.user\_id?

> `optional` **user\_id?**: `string` \| `null`

###### Tables.drivers.Relationships

> **Relationships**: \[\]

###### Tables.drivers.Row

> **Row**: `object`

###### Tables.drivers.Row.adr\_expiry

> **adr\_expiry**: `string` \| `null`

###### Tables.drivers.Row.birth\_date\_enc

> **birth\_date\_enc**: `string` \| `null`

###### Tables.drivers.Row.code95\_expiry

> **code95\_expiry**: `string` \| `null`

###### Tables.drivers.Row.company\_id

> **company\_id**: `string`

###### Tables.drivers.Row.created\_at

> **created\_at**: `string`

###### Tables.drivers.Row.first\_name\_enc

> **first\_name\_enc**: `string` \| `null`

###### Tables.drivers.Row.id

> **id**: `string`

###### Tables.drivers.Row.id\_card\_enc

> **id\_card\_enc**: `string` \| `null`

###### Tables.drivers.Row.id\_card\_expiry

> **id\_card\_expiry**: `string` \| `null`

###### Tables.drivers.Row.last\_name\_enc

> **last\_name\_enc**: `string` \| `null`

###### Tables.drivers.Row.license\_categories

> **license\_categories**: `string`[]

###### Tables.drivers.Row.license\_enc

> **license\_enc**: `string` \| `null`

###### Tables.drivers.Row.license\_expiry

> **license\_expiry**: `string` \| `null`

###### Tables.drivers.Row.medical\_expiry

> **medical\_expiry**: `string` \| `null`

###### Tables.drivers.Row.notes

> **notes**: `string` \| `null`

###### Tables.drivers.Row.passport\_enc

> **passport\_enc**: `string` \| `null`

###### Tables.drivers.Row.passport\_expiry

> **passport\_expiry**: `string` \| `null`

###### Tables.drivers.Row.psychotech\_expiry

> **psychotech\_expiry**: `string` \| `null`

###### Tables.drivers.Row.qualification\_details

> **qualification\_details**: [`Json`](../api/api/src.md#json)

###### Tables.drivers.Row.qualifications

> **qualifications**: `string`[]

###### Tables.drivers.Row.updated\_at

> **updated\_at**: `string`

###### Tables.drivers.Row.user\_id

> **user\_id**: `string` \| `null`

###### Tables.drivers.Update

> **Update**: `object`

###### Tables.drivers.Update.adr\_expiry?

> `optional` **adr\_expiry?**: `string` \| `null`

###### Tables.drivers.Update.birth\_date\_enc?

> `optional` **birth\_date\_enc?**: `string` \| `null`

###### Tables.drivers.Update.code95\_expiry?

> `optional` **code95\_expiry?**: `string` \| `null`

###### Tables.drivers.Update.company\_id?

> `optional` **company\_id?**: `string`

###### Tables.drivers.Update.created\_at?

> `optional` **created\_at?**: `string`

###### Tables.drivers.Update.first\_name\_enc?

> `optional` **first\_name\_enc?**: `string` \| `null`

###### Tables.drivers.Update.id?

> `optional` **id?**: `string`

###### Tables.drivers.Update.id\_card\_enc?

> `optional` **id\_card\_enc?**: `string` \| `null`

###### Tables.drivers.Update.id\_card\_expiry?

> `optional` **id\_card\_expiry?**: `string` \| `null`

###### Tables.drivers.Update.last\_name\_enc?

> `optional` **last\_name\_enc?**: `string` \| `null`

###### Tables.drivers.Update.license\_categories?

> `optional` **license\_categories?**: `string`[]

###### Tables.drivers.Update.license\_enc?

> `optional` **license\_enc?**: `string` \| `null`

###### Tables.drivers.Update.license\_expiry?

> `optional` **license\_expiry?**: `string` \| `null`

###### Tables.drivers.Update.medical\_expiry?

> `optional` **medical\_expiry?**: `string` \| `null`

###### Tables.drivers.Update.notes?

> `optional` **notes?**: `string` \| `null`

###### Tables.drivers.Update.passport\_enc?

> `optional` **passport\_enc?**: `string` \| `null`

###### Tables.drivers.Update.passport\_expiry?

> `optional` **passport\_expiry?**: `string` \| `null`

###### Tables.drivers.Update.psychotech\_expiry?

> `optional` **psychotech\_expiry?**: `string` \| `null`

###### Tables.drivers.Update.qualification\_details?

> `optional` **qualification\_details?**: [`Json`](../api/api/src.md#json)

###### Tables.drivers.Update.qualifications?

> `optional` **qualifications?**: `string`[]

###### Tables.drivers.Update.updated\_at?

> `optional` **updated\_at?**: `string`

###### Tables.drivers.Update.user\_id?

> `optional` **user\_id?**: `string` \| `null`

###### Tables.expo\_push\_tokens

> **expo\_push\_tokens**: `object`

###### Tables.expo\_push\_tokens.Insert

> **Insert**: `object`

###### Tables.expo\_push\_tokens.Insert.company\_id?

> `optional` **company\_id?**: `string` \| `null`

###### Tables.expo\_push\_tokens.Insert.created\_at?

> `optional` **created\_at?**: `string`

###### Tables.expo\_push\_tokens.Insert.id?

> `optional` **id?**: `string`

###### Tables.expo\_push\_tokens.Insert.platform?

> `optional` **platform?**: `string` \| `null`

###### Tables.expo\_push\_tokens.Insert.token

> **token**: `string`

###### Tables.expo\_push\_tokens.Insert.user\_id

> **user\_id**: `string`

###### Tables.expo\_push\_tokens.Relationships

> **Relationships**: \[\]

###### Tables.expo\_push\_tokens.Row

> **Row**: `object`

###### Tables.expo\_push\_tokens.Row.company\_id

> **company\_id**: `string` \| `null`

###### Tables.expo\_push\_tokens.Row.created\_at

> **created\_at**: `string`

###### Tables.expo\_push\_tokens.Row.id

> **id**: `string`

###### Tables.expo\_push\_tokens.Row.platform

> **platform**: `string` \| `null`

###### Tables.expo\_push\_tokens.Row.token

> **token**: `string`

###### Tables.expo\_push\_tokens.Row.user\_id

> **user\_id**: `string`

###### Tables.expo\_push\_tokens.Update

> **Update**: `object`

###### Tables.expo\_push\_tokens.Update.company\_id?

> `optional` **company\_id?**: `string` \| `null`

###### Tables.expo\_push\_tokens.Update.created\_at?

> `optional` **created\_at?**: `string`

###### Tables.expo\_push\_tokens.Update.id?

> `optional` **id?**: `string`

###### Tables.expo\_push\_tokens.Update.platform?

> `optional` **platform?**: `string` \| `null`

###### Tables.expo\_push\_tokens.Update.token?

> `optional` **token?**: `string`

###### Tables.expo\_push\_tokens.Update.user\_id?

> `optional` **user\_id?**: `string`

###### Tables.fuel\_cards

> **fuel\_cards**: `object`

###### Tables.fuel\_cards.Insert

> **Insert**: `object`

###### Tables.fuel\_cards.Insert.card\_number\_masked

> **card\_number\_masked**: `string`

###### Tables.fuel\_cards.Insert.company\_id

> **company\_id**: `string`

###### Tables.fuel\_cards.Insert.created\_at?

> `optional` **created\_at?**: `string`

###### Tables.fuel\_cards.Insert.discount\_percent?

> `optional` **discount\_percent?**: `number`

###### Tables.fuel\_cards.Insert.id?

> `optional` **id?**: `string`

###### Tables.fuel\_cards.Insert.notes?

> `optional` **notes?**: `string` \| `null`

###### Tables.fuel\_cards.Insert.pin\_encrypted?

> `optional` **pin\_encrypted?**: `string` \| `null`

###### Tables.fuel\_cards.Insert.provider

> **provider**: `"dkv"` \| `"eurowag"` \| `"shell"` \| `"bp"` \| `"circlek"` \| `"e100"` \| `"uta"` \| `"as24"` \| `"aral"` \| `"omv"` \| `"routex"` \| `"logpay"` \| `"esso"` \| `"totalenergies"` \| `"tankpool24"` \| `"morganfuels"` \| `"iqcard"` \| `"other"`

###### Tables.fuel\_cards.Insert.updated\_at?

> `optional` **updated\_at?**: `string`

###### Tables.fuel\_cards.Insert.valid\_until?

> `optional` **valid\_until?**: `string` \| `null`

###### Tables.fuel\_cards.Insert.vehicle\_id?

> `optional` **vehicle\_id?**: `string` \| `null`

###### Tables.fuel\_cards.Relationships

> **Relationships**: \[\]

###### Tables.fuel\_cards.Row

> **Row**: `object`

###### Tables.fuel\_cards.Row.card\_number\_masked

> **card\_number\_masked**: `string`

###### Tables.fuel\_cards.Row.company\_id

> **company\_id**: `string`

###### Tables.fuel\_cards.Row.created\_at

> **created\_at**: `string`

###### Tables.fuel\_cards.Row.discount\_percent

> **discount\_percent**: `number`

###### Tables.fuel\_cards.Row.id

> **id**: `string`

###### Tables.fuel\_cards.Row.notes

> **notes**: `string` \| `null`

###### Tables.fuel\_cards.Row.pin\_encrypted

> **pin\_encrypted**: `string` \| `null`

###### Tables.fuel\_cards.Row.provider

> **provider**: `"dkv"` \| `"eurowag"` \| `"shell"` \| `"bp"` \| `"circlek"` \| `"e100"` \| `"uta"` \| `"as24"` \| `"aral"` \| `"omv"` \| `"routex"` \| `"logpay"` \| `"esso"` \| `"totalenergies"` \| `"tankpool24"` \| `"morganfuels"` \| `"iqcard"` \| `"other"`

###### Tables.fuel\_cards.Row.updated\_at

> **updated\_at**: `string`

###### Tables.fuel\_cards.Row.valid\_until

> **valid\_until**: `string` \| `null`

###### Tables.fuel\_cards.Row.vehicle\_id

> **vehicle\_id**: `string` \| `null`

###### Tables.fuel\_cards.Update

> **Update**: `object`

###### Tables.fuel\_cards.Update.card\_number\_masked?

> `optional` **card\_number\_masked?**: `string`

###### Tables.fuel\_cards.Update.company\_id?

> `optional` **company\_id?**: `string`

###### Tables.fuel\_cards.Update.created\_at?

> `optional` **created\_at?**: `string`

###### Tables.fuel\_cards.Update.discount\_percent?

> `optional` **discount\_percent?**: `number`

###### Tables.fuel\_cards.Update.id?

> `optional` **id?**: `string`

###### Tables.fuel\_cards.Update.notes?

> `optional` **notes?**: `string` \| `null`

###### Tables.fuel\_cards.Update.pin\_encrypted?

> `optional` **pin\_encrypted?**: `string` \| `null`

###### Tables.fuel\_cards.Update.provider?

> `optional` **provider?**: `"dkv"` \| `"eurowag"` \| `"shell"` \| `"bp"` \| `"circlek"` \| `"e100"` \| `"uta"` \| `"as24"` \| `"aral"` \| `"omv"` \| `"routex"` \| `"logpay"` \| `"esso"` \| `"totalenergies"` \| `"tankpool24"` \| `"morganfuels"` \| `"iqcard"` \| `"other"`

###### Tables.fuel\_cards.Update.updated\_at?

> `optional` **updated\_at?**: `string`

###### Tables.fuel\_cards.Update.valid\_until?

> `optional` **valid\_until?**: `string` \| `null`

###### Tables.fuel\_cards.Update.vehicle\_id?

> `optional` **vehicle\_id?**: `string` \| `null`

###### Tables.fuel\_log\_revisions

> **fuel\_log\_revisions**: `object`

###### Tables.fuel\_log\_revisions.Insert

> **Insert**: `object`

###### Tables.fuel\_log\_revisions.Insert.edited\_at?

> `optional` **edited\_at?**: `string`

###### Tables.fuel\_log\_revisions.Insert.edited\_by?

> `optional` **edited\_by?**: `string` \| `null`

###### Tables.fuel\_log\_revisions.Insert.fuel\_log\_id

> **fuel\_log\_id**: `string`

###### Tables.fuel\_log\_revisions.Insert.id?

> `optional` **id?**: `string`

###### Tables.fuel\_log\_revisions.Insert.revision

> **revision**: `number`

###### Tables.fuel\_log\_revisions.Insert.snapshot

> **snapshot**: [`Json`](../api/api/src.md#json)

###### Tables.fuel\_log\_revisions.Relationships

> **Relationships**: \[\]

###### Tables.fuel\_log\_revisions.Row

> **Row**: `object`

###### Tables.fuel\_log\_revisions.Row.edited\_at

> **edited\_at**: `string`

###### Tables.fuel\_log\_revisions.Row.edited\_by

> **edited\_by**: `string` \| `null`

###### Tables.fuel\_log\_revisions.Row.fuel\_log\_id

> **fuel\_log\_id**: `string`

###### Tables.fuel\_log\_revisions.Row.id

> **id**: `string`

###### Tables.fuel\_log\_revisions.Row.revision

> **revision**: `number`

###### Tables.fuel\_log\_revisions.Row.snapshot

> **snapshot**: [`Json`](../api/api/src.md#json)

###### Tables.fuel\_log\_revisions.Update

> **Update**: `object`

###### Tables.fuel\_log\_revisions.Update.edited\_at?

> `optional` **edited\_at?**: `string`

###### Tables.fuel\_log\_revisions.Update.edited\_by?

> `optional` **edited\_by?**: `string` \| `null`

###### Tables.fuel\_log\_revisions.Update.fuel\_log\_id?

> `optional` **fuel\_log\_id?**: `string`

###### Tables.fuel\_log\_revisions.Update.id?

> `optional` **id?**: `string`

###### Tables.fuel\_log\_revisions.Update.revision?

> `optional` **revision?**: `number`

###### Tables.fuel\_log\_revisions.Update.snapshot?

> `optional` **snapshot?**: [`Json`](../api/api/src.md#json)

###### Tables.fuel\_logs

> **fuel\_logs**: `object`

###### Tables.fuel\_logs.Insert

> **Insert**: `object`

###### Tables.fuel\_logs.Insert.comment?

> `optional` **comment?**: `string` \| `null`

###### Tables.fuel\_logs.Insert.company\_id

> **company\_id**: `string`

###### Tables.fuel\_logs.Insert.created\_at?

> `optional` **created\_at?**: `string`

###### Tables.fuel\_logs.Insert.device\_id?

> `optional` **device\_id?**: `string` \| `null`

###### Tables.fuel\_logs.Insert.driver\_id

> **driver\_id**: `string`

###### Tables.fuel\_logs.Insert.fuel\_card\_id?

> `optional` **fuel\_card\_id?**: `string` \| `null`

###### Tables.fuel\_logs.Insert.geo?

> `optional` **geo?**: `unknown`

###### Tables.fuel\_logs.Insert.id

> **id**: `string`

###### Tables.fuel\_logs.Insert.is\_full?

> `optional` **is\_full?**: `boolean`

###### Tables.fuel\_logs.Insert.liters

> **liters**: `number`

###### Tables.fuel\_logs.Insert.odometer\_km

> **odometer\_km**: `number`

###### Tables.fuel\_logs.Insert.payment\_method

> **payment\_method**: `"card"` \| `"cash"`

###### Tables.fuel\_logs.Insert.price\_total?

> `optional` **price\_total?**: `number` \| `null`

###### Tables.fuel\_logs.Insert.revision?

> `optional` **revision?**: `number`

###### Tables.fuel\_logs.Insert.station\_city?

> `optional` **station\_city?**: `string` \| `null`

###### Tables.fuel\_logs.Insert.station\_company?

> `optional` **station\_company?**: `string` \| `null`

###### Tables.fuel\_logs.Insert.station\_country

> **station\_country**: `string`

###### Tables.fuel\_logs.Insert.station\_loc?

> `optional` **station\_loc?**: `string` \| `null`

###### Tables.fuel\_logs.Insert.station\_postcode?

> `optional` **station\_postcode?**: `string` \| `null`

###### Tables.fuel\_logs.Insert.synced\_at?

> `optional` **synced\_at?**: `string` \| `null`

###### Tables.fuel\_logs.Insert.updated\_at?

> `optional` **updated\_at?**: `string`

###### Tables.fuel\_logs.Insert.vehicle\_id

> **vehicle\_id**: `string`

###### Tables.fuel\_logs.Relationships

> **Relationships**: \[\]

###### Tables.fuel\_logs.Row

> **Row**: `object`

###### Tables.fuel\_logs.Row.comment

> **comment**: `string` \| `null`

###### Tables.fuel\_logs.Row.company\_id

> **company\_id**: `string`

###### Tables.fuel\_logs.Row.created\_at

> **created\_at**: `string`

###### Tables.fuel\_logs.Row.device\_id

> **device\_id**: `string` \| `null`

###### Tables.fuel\_logs.Row.driver\_id

> **driver\_id**: `string`

###### Tables.fuel\_logs.Row.fuel\_card\_id

> **fuel\_card\_id**: `string` \| `null`

###### Tables.fuel\_logs.Row.geo

> **geo**: `unknown`

###### Tables.fuel\_logs.Row.id

> **id**: `string`

###### Tables.fuel\_logs.Row.is\_full

> **is\_full**: `boolean`

###### Tables.fuel\_logs.Row.liters

> **liters**: `number`

###### Tables.fuel\_logs.Row.odometer\_km

> **odometer\_km**: `number`

###### Tables.fuel\_logs.Row.payment\_method

> **payment\_method**: `"card"` \| `"cash"`

###### Tables.fuel\_logs.Row.price\_total

> **price\_total**: `number` \| `null`

###### Tables.fuel\_logs.Row.revision

> **revision**: `number`

###### Tables.fuel\_logs.Row.station\_city

> **station\_city**: `string` \| `null`

###### Tables.fuel\_logs.Row.station\_company

> **station\_company**: `string` \| `null`

###### Tables.fuel\_logs.Row.station\_country

> **station\_country**: `string`

###### Tables.fuel\_logs.Row.station\_loc

> **station\_loc**: `string` \| `null`

###### Tables.fuel\_logs.Row.station\_postcode

> **station\_postcode**: `string` \| `null`

###### Tables.fuel\_logs.Row.synced\_at

> **synced\_at**: `string` \| `null`

###### Tables.fuel\_logs.Row.updated\_at

> **updated\_at**: `string`

###### Tables.fuel\_logs.Row.vehicle\_id

> **vehicle\_id**: `string`

###### Tables.fuel\_logs.Update

> **Update**: `object`

###### Tables.fuel\_logs.Update.comment?

> `optional` **comment?**: `string` \| `null`

###### Tables.fuel\_logs.Update.company\_id?

> `optional` **company\_id?**: `string`

###### Tables.fuel\_logs.Update.created\_at?

> `optional` **created\_at?**: `string`

###### Tables.fuel\_logs.Update.device\_id?

> `optional` **device\_id?**: `string` \| `null`

###### Tables.fuel\_logs.Update.driver\_id?

> `optional` **driver\_id?**: `string`

###### Tables.fuel\_logs.Update.fuel\_card\_id?

> `optional` **fuel\_card\_id?**: `string` \| `null`

###### Tables.fuel\_logs.Update.geo?

> `optional` **geo?**: `unknown`

###### Tables.fuel\_logs.Update.id?

> `optional` **id?**: `string`

###### Tables.fuel\_logs.Update.is\_full?

> `optional` **is\_full?**: `boolean`

###### Tables.fuel\_logs.Update.liters?

> `optional` **liters?**: `number`

###### Tables.fuel\_logs.Update.odometer\_km?

> `optional` **odometer\_km?**: `number`

###### Tables.fuel\_logs.Update.payment\_method?

> `optional` **payment\_method?**: `"card"` \| `"cash"`

###### Tables.fuel\_logs.Update.price\_total?

> `optional` **price\_total?**: `number` \| `null`

###### Tables.fuel\_logs.Update.revision?

> `optional` **revision?**: `number`

###### Tables.fuel\_logs.Update.station\_city?

> `optional` **station\_city?**: `string` \| `null`

###### Tables.fuel\_logs.Update.station\_company?

> `optional` **station\_company?**: `string` \| `null`

###### Tables.fuel\_logs.Update.station\_country?

> `optional` **station\_country?**: `string`

###### Tables.fuel\_logs.Update.station\_loc?

> `optional` **station\_loc?**: `string` \| `null`

###### Tables.fuel\_logs.Update.station\_postcode?

> `optional` **station\_postcode?**: `string` \| `null`

###### Tables.fuel\_logs.Update.synced\_at?

> `optional` **synced\_at?**: `string` \| `null`

###### Tables.fuel\_logs.Update.updated\_at?

> `optional` **updated\_at?**: `string`

###### Tables.fuel\_logs.Update.vehicle\_id?

> `optional` **vehicle\_id?**: `string`

###### Tables.fuel\_prices

> **fuel\_prices**: `object`

###### Tables.fuel\_prices.Insert

> **Insert**: `object`

###### Tables.fuel\_prices.Insert.currency?

> `optional` **currency?**: `string`

###### Tables.fuel\_prices.Insert.fuel\_type?

> `optional` **fuel\_type?**: `string`

###### Tables.fuel\_prices.Insert.id?

> `optional` **id?**: `string`

###### Tables.fuel\_prices.Insert.poi\_id?

> `optional` **poi\_id?**: `string` \| `null`

###### Tables.fuel\_prices.Insert.price

> **price**: `number`

###### Tables.fuel\_prices.Insert.reported\_at?

> `optional` **reported\_at?**: `string`

###### Tables.fuel\_prices.Insert.reported\_by?

> `optional` **reported\_by?**: `string` \| `null`

###### Tables.fuel\_prices.Insert.source?

> `optional` **source?**: `string` \| `null`

###### Tables.fuel\_prices.Relationships

> **Relationships**: \[\]

###### Tables.fuel\_prices.Row

> **Row**: `object`

###### Tables.fuel\_prices.Row.currency

> **currency**: `string`

###### Tables.fuel\_prices.Row.fuel\_type

> **fuel\_type**: `string`

###### Tables.fuel\_prices.Row.id

> **id**: `string`

###### Tables.fuel\_prices.Row.poi\_id

> **poi\_id**: `string` \| `null`

###### Tables.fuel\_prices.Row.price

> **price**: `number`

###### Tables.fuel\_prices.Row.reported\_at

> **reported\_at**: `string`

###### Tables.fuel\_prices.Row.reported\_by

> **reported\_by**: `string` \| `null`

###### Tables.fuel\_prices.Row.source

> **source**: `string` \| `null`

###### Tables.fuel\_prices.Update

> **Update**: `object`

###### Tables.fuel\_prices.Update.currency?

> `optional` **currency?**: `string`

###### Tables.fuel\_prices.Update.fuel\_type?

> `optional` **fuel\_type?**: `string`

###### Tables.fuel\_prices.Update.id?

> `optional` **id?**: `string`

###### Tables.fuel\_prices.Update.poi\_id?

> `optional` **poi\_id?**: `string` \| `null`

###### Tables.fuel\_prices.Update.price?

> `optional` **price?**: `number`

###### Tables.fuel\_prices.Update.reported\_at?

> `optional` **reported\_at?**: `string`

###### Tables.fuel\_prices.Update.reported\_by?

> `optional` **reported\_by?**: `string` \| `null`

###### Tables.fuel\_prices.Update.source?

> `optional` **source?**: `string` \| `null`

###### Tables.invites

> **invites**: `object`

###### Tables.invites.Insert

> **Insert**: `object`

###### Tables.invites.Insert.accepted\_at?

> `optional` **accepted\_at?**: `string` \| `null`

###### Tables.invites.Insert.company\_id

> **company\_id**: `string`

###### Tables.invites.Insert.created\_at?

> `optional` **created\_at?**: `string`

###### Tables.invites.Insert.email\_enc?

> `optional` **email\_enc?**: `string` \| `null`

###### Tables.invites.Insert.expires\_at?

> `optional` **expires\_at?**: `string`

###### Tables.invites.Insert.id?

> `optional` **id?**: `string`

###### Tables.invites.Insert.permissions?

> `optional` **permissions?**: [`Json`](../api/api/src.md#json)

###### Tables.invites.Insert.role?

> `optional` **role?**: `"developer"` \| `"owner"` \| `"dispatcher"` \| `"driver"`

###### Tables.invites.Insert.token\_hash

> **token\_hash**: `string`

###### Tables.invites.Insert.vehicle\_id?

> `optional` **vehicle\_id?**: `string` \| `null`

###### Tables.invites.Relationships

> **Relationships**: \[\]

###### Tables.invites.Row

> **Row**: `object`

###### Tables.invites.Row.accepted\_at

> **accepted\_at**: `string` \| `null`

###### Tables.invites.Row.company\_id

> **company\_id**: `string`

###### Tables.invites.Row.created\_at

> **created\_at**: `string`

###### Tables.invites.Row.email\_enc

> **email\_enc**: `string` \| `null`

###### Tables.invites.Row.expires\_at

> **expires\_at**: `string`

###### Tables.invites.Row.id

> **id**: `string`

###### Tables.invites.Row.permissions

> **permissions**: [`Json`](../api/api/src.md#json)

###### Tables.invites.Row.role

> **role**: `"developer"` \| `"owner"` \| `"dispatcher"` \| `"driver"`

###### Tables.invites.Row.token\_hash

> **token\_hash**: `string`

###### Tables.invites.Row.vehicle\_id

> **vehicle\_id**: `string` \| `null`

###### Tables.invites.Update

> **Update**: `object`

###### Tables.invites.Update.accepted\_at?

> `optional` **accepted\_at?**: `string` \| `null`

###### Tables.invites.Update.company\_id?

> `optional` **company\_id?**: `string`

###### Tables.invites.Update.created\_at?

> `optional` **created\_at?**: `string`

###### Tables.invites.Update.email\_enc?

> `optional` **email\_enc?**: `string` \| `null`

###### Tables.invites.Update.expires\_at?

> `optional` **expires\_at?**: `string`

###### Tables.invites.Update.id?

> `optional` **id?**: `string`

###### Tables.invites.Update.permissions?

> `optional` **permissions?**: [`Json`](../api/api/src.md#json)

###### Tables.invites.Update.role?

> `optional` **role?**: `"developer"` \| `"owner"` \| `"dispatcher"` \| `"driver"`

###### Tables.invites.Update.token\_hash?

> `optional` **token\_hash?**: `string`

###### Tables.invites.Update.vehicle\_id?

> `optional` **vehicle\_id?**: `string` \| `null`

###### Tables.invoice\_items

> **invoice\_items**: `object`

###### Tables.invoice\_items.Insert

> **Insert**: `object`

###### Tables.invoice\_items.Insert.created\_at?

> `optional` **created\_at?**: `string`

###### Tables.invoice\_items.Insert.description

> **description**: `string`

###### Tables.invoice\_items.Insert.gross?

> `optional` **gross?**: `number`

###### Tables.invoice\_items.Insert.id?

> `optional` **id?**: `string`

###### Tables.invoice\_items.Insert.invoice\_id

> **invoice\_id**: `string`

###### Tables.invoice\_items.Insert.net?

> `optional` **net?**: `number`

###### Tables.invoice\_items.Insert.position?

> `optional` **position?**: `number`

###### Tables.invoice\_items.Insert.quantity?

> `optional` **quantity?**: `number`

###### Tables.invoice\_items.Insert.unit\_price?

> `optional` **unit\_price?**: `number`

###### Tables.invoice\_items.Insert.vat\_amount?

> `optional` **vat\_amount?**: `number`

###### Tables.invoice\_items.Insert.vat\_rate?

> `optional` **vat\_rate?**: `number`

###### Tables.invoice\_items.Relationships

> **Relationships**: \[\]

###### Tables.invoice\_items.Row

> **Row**: `object`

###### Tables.invoice\_items.Row.created\_at

> **created\_at**: `string`

###### Tables.invoice\_items.Row.description

> **description**: `string`

###### Tables.invoice\_items.Row.gross

> **gross**: `number`

###### Tables.invoice\_items.Row.id

> **id**: `string`

###### Tables.invoice\_items.Row.invoice\_id

> **invoice\_id**: `string`

###### Tables.invoice\_items.Row.net

> **net**: `number`

###### Tables.invoice\_items.Row.position

> **position**: `number`

###### Tables.invoice\_items.Row.quantity

> **quantity**: `number`

###### Tables.invoice\_items.Row.unit\_price

> **unit\_price**: `number`

###### Tables.invoice\_items.Row.vat\_amount

> **vat\_amount**: `number`

###### Tables.invoice\_items.Row.vat\_rate

> **vat\_rate**: `number`

###### Tables.invoice\_items.Update

> **Update**: `object`

###### Tables.invoice\_items.Update.created\_at?

> `optional` **created\_at?**: `string`

###### Tables.invoice\_items.Update.description?

> `optional` **description?**: `string`

###### Tables.invoice\_items.Update.gross?

> `optional` **gross?**: `number`

###### Tables.invoice\_items.Update.id?

> `optional` **id?**: `string`

###### Tables.invoice\_items.Update.invoice\_id?

> `optional` **invoice\_id?**: `string`

###### Tables.invoice\_items.Update.net?

> `optional` **net?**: `number`

###### Tables.invoice\_items.Update.position?

> `optional` **position?**: `number`

###### Tables.invoice\_items.Update.quantity?

> `optional` **quantity?**: `number`

###### Tables.invoice\_items.Update.unit\_price?

> `optional` **unit\_price?**: `number`

###### Tables.invoice\_items.Update.vat\_amount?

> `optional` **vat\_amount?**: `number`

###### Tables.invoice\_items.Update.vat\_rate?

> `optional` **vat\_rate?**: `number`

###### Tables.invoices

> **invoices**: `object`

###### Tables.invoices.Insert

> **Insert**: `object`

###### Tables.invoices.Insert.buyer\_address?

> `optional` **buyer\_address?**: `string` \| `null`

###### Tables.invoices.Insert.buyer\_name?

> `optional` **buyer\_name?**: `string` \| `null`

###### Tables.invoices.Insert.buyer\_tax\_id?

> `optional` **buyer\_tax\_id?**: `string` \| `null`

###### Tables.invoices.Insert.company\_id

> **company\_id**: `string`

###### Tables.invoices.Insert.created\_at?

> `optional` **created\_at?**: `string`

###### Tables.invoices.Insert.currency?

> `optional` **currency?**: `string`

###### Tables.invoices.Insert.description?

> `optional` **description?**: `string` \| `null`

###### Tables.invoices.Insert.due\_date?

> `optional` **due\_date?**: `string` \| `null`

###### Tables.invoices.Insert.gross?

> `optional` **gross?**: `number`

###### Tables.invoices.Insert.id?

> `optional` **id?**: `string`

###### Tables.invoices.Insert.issue\_date?

> `optional` **issue\_date?**: `string`

###### Tables.invoices.Insert.net?

> `optional` **net?**: `number`

###### Tables.invoices.Insert.number

> **number**: `string`

###### Tables.invoices.Insert.order\_id?

> `optional` **order\_id?**: `string` \| `null`

###### Tables.invoices.Insert.paid\_at?

> `optional` **paid\_at?**: `string` \| `null`

###### Tables.invoices.Insert.seller\_account?

> `optional` **seller\_account?**: `string` \| `null`

###### Tables.invoices.Insert.seller\_address?

> `optional` **seller\_address?**: `string` \| `null`

###### Tables.invoices.Insert.seller\_bank?

> `optional` **seller\_bank?**: `string` \| `null`

###### Tables.invoices.Insert.seller\_name?

> `optional` **seller\_name?**: `string` \| `null`

###### Tables.invoices.Insert.seller\_tax\_id?

> `optional` **seller\_tax\_id?**: `string` \| `null`

###### Tables.invoices.Insert.status?

> `optional` **status?**: `string`

###### Tables.invoices.Insert.vat\_amount?

> `optional` **vat\_amount?**: `number`

###### Tables.invoices.Insert.vat\_rate?

> `optional` **vat\_rate?**: `number`

###### Tables.invoices.Relationships

> **Relationships**: \[\]

###### Tables.invoices.Row

> **Row**: `object`

###### Tables.invoices.Row.buyer\_address

> **buyer\_address**: `string` \| `null`

###### Tables.invoices.Row.buyer\_name

> **buyer\_name**: `string` \| `null`

###### Tables.invoices.Row.buyer\_tax\_id

> **buyer\_tax\_id**: `string` \| `null`

###### Tables.invoices.Row.company\_id

> **company\_id**: `string`

###### Tables.invoices.Row.created\_at

> **created\_at**: `string`

###### Tables.invoices.Row.currency

> **currency**: `string`

###### Tables.invoices.Row.description

> **description**: `string` \| `null`

###### Tables.invoices.Row.due\_date

> **due\_date**: `string` \| `null`

###### Tables.invoices.Row.gross

> **gross**: `number`

###### Tables.invoices.Row.id

> **id**: `string`

###### Tables.invoices.Row.issue\_date

> **issue\_date**: `string`

###### Tables.invoices.Row.net

> **net**: `number`

###### Tables.invoices.Row.number

> **number**: `string`

###### Tables.invoices.Row.order\_id

> **order\_id**: `string` \| `null`

###### Tables.invoices.Row.paid\_at

> **paid\_at**: `string` \| `null`

###### Tables.invoices.Row.seller\_account

> **seller\_account**: `string` \| `null`

###### Tables.invoices.Row.seller\_address

> **seller\_address**: `string` \| `null`

###### Tables.invoices.Row.seller\_bank

> **seller\_bank**: `string` \| `null`

###### Tables.invoices.Row.seller\_name

> **seller\_name**: `string` \| `null`

###### Tables.invoices.Row.seller\_tax\_id

> **seller\_tax\_id**: `string` \| `null`

###### Tables.invoices.Row.status

> **status**: `string`

###### Tables.invoices.Row.vat\_amount

> **vat\_amount**: `number`

###### Tables.invoices.Row.vat\_rate

> **vat\_rate**: `number`

###### Tables.invoices.Update

> **Update**: `object`

###### Tables.invoices.Update.buyer\_address?

> `optional` **buyer\_address?**: `string` \| `null`

###### Tables.invoices.Update.buyer\_name?

> `optional` **buyer\_name?**: `string` \| `null`

###### Tables.invoices.Update.buyer\_tax\_id?

> `optional` **buyer\_tax\_id?**: `string` \| `null`

###### Tables.invoices.Update.company\_id?

> `optional` **company\_id?**: `string`

###### Tables.invoices.Update.created\_at?

> `optional` **created\_at?**: `string`

###### Tables.invoices.Update.currency?

> `optional` **currency?**: `string`

###### Tables.invoices.Update.description?

> `optional` **description?**: `string` \| `null`

###### Tables.invoices.Update.due\_date?

> `optional` **due\_date?**: `string` \| `null`

###### Tables.invoices.Update.gross?

> `optional` **gross?**: `number`

###### Tables.invoices.Update.id?

> `optional` **id?**: `string`

###### Tables.invoices.Update.issue\_date?

> `optional` **issue\_date?**: `string`

###### Tables.invoices.Update.net?

> `optional` **net?**: `number`

###### Tables.invoices.Update.number?

> `optional` **number?**: `string`

###### Tables.invoices.Update.order\_id?

> `optional` **order\_id?**: `string` \| `null`

###### Tables.invoices.Update.paid\_at?

> `optional` **paid\_at?**: `string` \| `null`

###### Tables.invoices.Update.seller\_account?

> `optional` **seller\_account?**: `string` \| `null`

###### Tables.invoices.Update.seller\_address?

> `optional` **seller\_address?**: `string` \| `null`

###### Tables.invoices.Update.seller\_bank?

> `optional` **seller\_bank?**: `string` \| `null`

###### Tables.invoices.Update.seller\_name?

> `optional` **seller\_name?**: `string` \| `null`

###### Tables.invoices.Update.seller\_tax\_id?

> `optional` **seller\_tax\_id?**: `string` \| `null`

###### Tables.invoices.Update.status?

> `optional` **status?**: `string`

###### Tables.invoices.Update.vat\_amount?

> `optional` **vat\_amount?**: `number`

###### Tables.invoices.Update.vat\_rate?

> `optional` **vat\_rate?**: `number`

###### Tables.map\_reports

> **map\_reports**: `object`

###### Tables.map\_reports.Insert

> **Insert**: `object`

###### Tables.map\_reports.Insert.comment?

> `optional` **comment?**: `string` \| `null`

###### Tables.map\_reports.Insert.confidence?

> `optional` **confidence?**: `number`

###### Tables.map\_reports.Insert.created\_at?

> `optional` **created\_at?**: `string`

###### Tables.map\_reports.Insert.expires\_at?

> `optional` **expires\_at?**: `string`

###### Tables.map\_reports.Insert.geo

> **geo**: `unknown`

###### Tables.map\_reports.Insert.id?

> `optional` **id?**: `string`

###### Tables.map\_reports.Insert.lat?

> `optional` **lat?**: `number` \| `null`

###### Tables.map\_reports.Insert.lng?

> `optional` **lng?**: `number` \| `null`

###### Tables.map\_reports.Insert.reported\_by?

> `optional` **reported\_by?**: `string` \| `null`

###### Tables.map\_reports.Insert.type

> **type**: `"weigh"` \| `"accident"` \| `"police"` \| `"closure"` \| `"traffic"` \| `"hazard"`

###### Tables.map\_reports.Insert.votes?

> `optional` **votes?**: `number`

###### Tables.map\_reports.Relationships

> **Relationships**: \[\]

###### Tables.map\_reports.Row

> **Row**: `object`

###### Tables.map\_reports.Row.comment

> **comment**: `string` \| `null`

###### Tables.map\_reports.Row.confidence

> **confidence**: `number`

###### Tables.map\_reports.Row.created\_at

> **created\_at**: `string`

###### Tables.map\_reports.Row.expires\_at

> **expires\_at**: `string`

###### Tables.map\_reports.Row.geo

> **geo**: `unknown`

###### Tables.map\_reports.Row.id

> **id**: `string`

###### Tables.map\_reports.Row.lat

> **lat**: `number` \| `null`

###### Tables.map\_reports.Row.lng

> **lng**: `number` \| `null`

###### Tables.map\_reports.Row.reported\_by

> **reported\_by**: `string` \| `null`

###### Tables.map\_reports.Row.type

> **type**: `"weigh"` \| `"accident"` \| `"police"` \| `"closure"` \| `"traffic"` \| `"hazard"`

###### Tables.map\_reports.Row.votes

> **votes**: `number`

###### Tables.map\_reports.Update

> **Update**: `object`

###### Tables.map\_reports.Update.comment?

> `optional` **comment?**: `string` \| `null`

###### Tables.map\_reports.Update.confidence?

> `optional` **confidence?**: `number`

###### Tables.map\_reports.Update.created\_at?

> `optional` **created\_at?**: `string`

###### Tables.map\_reports.Update.expires\_at?

> `optional` **expires\_at?**: `string`

###### Tables.map\_reports.Update.geo?

> `optional` **geo?**: `unknown`

###### Tables.map\_reports.Update.id?

> `optional` **id?**: `string`

###### Tables.map\_reports.Update.lat?

> `optional` **lat?**: `number` \| `null`

###### Tables.map\_reports.Update.lng?

> `optional` **lng?**: `number` \| `null`

###### Tables.map\_reports.Update.reported\_by?

> `optional` **reported\_by?**: `string` \| `null`

###### Tables.map\_reports.Update.type?

> `optional` **type?**: `"weigh"` \| `"accident"` \| `"police"` \| `"closure"` \| `"traffic"` \| `"hazard"`

###### Tables.map\_reports.Update.votes?

> `optional` **votes?**: `number`

###### Tables.memberships

> **memberships**: `object`

###### Tables.memberships.Insert

> **Insert**: `object`

###### Tables.memberships.Insert.company\_id?

> `optional` **company\_id?**: `string` \| `null`

###### Tables.memberships.Insert.created\_at?

> `optional` **created\_at?**: `string`

###### Tables.memberships.Insert.id?

> `optional` **id?**: `string`

###### Tables.memberships.Insert.modules?

> `optional` **modules?**: `string`[] \| `null`

###### Tables.memberships.Insert.permissions?

> `optional` **permissions?**: [`Json`](../api/api/src.md#json)

###### Tables.memberships.Insert.role

> **role**: `"developer"` \| `"owner"` \| `"dispatcher"` \| `"driver"`

###### Tables.memberships.Insert.status?

> `optional` **status?**: `"active"` \| `"invited"` \| `"disabled"`

###### Tables.memberships.Insert.user\_id

> **user\_id**: `string`

###### Tables.memberships.Relationships

> **Relationships**: \[\]

###### Tables.memberships.Row

> **Row**: `object`

###### Tables.memberships.Row.company\_id

> **company\_id**: `string` \| `null`

###### Tables.memberships.Row.created\_at

> **created\_at**: `string`

###### Tables.memberships.Row.id

> **id**: `string`

###### Tables.memberships.Row.modules

> **modules**: `string`[] \| `null`

###### Tables.memberships.Row.permissions

> **permissions**: [`Json`](../api/api/src.md#json)

###### Tables.memberships.Row.role

> **role**: `"developer"` \| `"owner"` \| `"dispatcher"` \| `"driver"`

###### Tables.memberships.Row.status

> **status**: `"active"` \| `"invited"` \| `"disabled"`

###### Tables.memberships.Row.user\_id

> **user\_id**: `string`

###### Tables.memberships.Update

> **Update**: `object`

###### Tables.memberships.Update.company\_id?

> `optional` **company\_id?**: `string` \| `null`

###### Tables.memberships.Update.created\_at?

> `optional` **created\_at?**: `string`

###### Tables.memberships.Update.id?

> `optional` **id?**: `string`

###### Tables.memberships.Update.modules?

> `optional` **modules?**: `string`[] \| `null`

###### Tables.memberships.Update.permissions?

> `optional` **permissions?**: [`Json`](../api/api/src.md#json)

###### Tables.memberships.Update.role?

> `optional` **role?**: `"developer"` \| `"owner"` \| `"dispatcher"` \| `"driver"`

###### Tables.memberships.Update.status?

> `optional` **status?**: `"active"` \| `"invited"` \| `"disabled"`

###### Tables.memberships.Update.user\_id?

> `optional` **user\_id?**: `string`

###### Tables.messages

> **messages**: `object`

###### Tables.messages.Insert

> **Insert**: `object`

###### Tables.messages.Insert.body

> **body**: `string`

###### Tables.messages.Insert.company\_id

> **company\_id**: `string`

###### Tables.messages.Insert.created\_at?

> `optional` **created\_at?**: `string`

###### Tables.messages.Insert.id?

> `optional` **id?**: `string`

###### Tables.messages.Insert.photo\_path?

> `optional` **photo\_path?**: `string` \| `null`

###### Tables.messages.Insert.sender\_id?

> `optional` **sender\_id?**: `string`

###### Tables.messages.Insert.sender\_label?

> `optional` **sender\_label?**: `string`

###### Tables.messages.Insert.thread\_id?

> `optional` **thread\_id?**: `string` \| `null`

###### Tables.messages.Relationships

> **Relationships**: \[\]

###### Tables.messages.Row

> **Row**: `object`

###### Tables.messages.Row.body

> **body**: `string`

###### Tables.messages.Row.company\_id

> **company\_id**: `string`

###### Tables.messages.Row.created\_at

> **created\_at**: `string`

###### Tables.messages.Row.id

> **id**: `string`

###### Tables.messages.Row.photo\_path

> **photo\_path**: `string` \| `null`

###### Tables.messages.Row.sender\_id

> **sender\_id**: `string`

###### Tables.messages.Row.sender\_label

> **sender\_label**: `string`

###### Tables.messages.Row.thread\_id

> **thread\_id**: `string` \| `null`

###### Tables.messages.Update

> **Update**: `object`

###### Tables.messages.Update.body?

> `optional` **body?**: `string`

###### Tables.messages.Update.company\_id?

> `optional` **company\_id?**: `string`

###### Tables.messages.Update.created\_at?

> `optional` **created\_at?**: `string`

###### Tables.messages.Update.id?

> `optional` **id?**: `string`

###### Tables.messages.Update.photo\_path?

> `optional` **photo\_path?**: `string` \| `null`

###### Tables.messages.Update.sender\_id?

> `optional` **sender\_id?**: `string`

###### Tables.messages.Update.sender\_label?

> `optional` **sender\_label?**: `string`

###### Tables.messages.Update.thread\_id?

> `optional` **thread\_id?**: `string` \| `null`

###### Tables.notifications

> **notifications**: `object`

###### Tables.notifications.Insert

> **Insert**: `object`

###### Tables.notifications.Insert.body?

> `optional` **body?**: `string` \| `null`

###### Tables.notifications.Insert.company\_id

> **company\_id**: `string`

###### Tables.notifications.Insert.created\_at?

> `optional` **created\_at?**: `string`

###### Tables.notifications.Insert.dedup\_key?

> `optional` **dedup\_key?**: `string` \| `null`

###### Tables.notifications.Insert.id?

> `optional` **id?**: `string`

###### Tables.notifications.Insert.read\_at?

> `optional` **read\_at?**: `string` \| `null`

###### Tables.notifications.Insert.severity?

> `optional` **severity?**: `string`

###### Tables.notifications.Insert.title

> **title**: `string`

###### Tables.notifications.Insert.type

> **type**: `string`

###### Tables.notifications.Insert.user\_id

> **user\_id**: `string`

###### Tables.notifications.Relationships

> **Relationships**: \[\]

###### Tables.notifications.Row

> **Row**: `object`

###### Tables.notifications.Row.body

> **body**: `string` \| `null`

###### Tables.notifications.Row.company\_id

> **company\_id**: `string`

###### Tables.notifications.Row.created\_at

> **created\_at**: `string`

###### Tables.notifications.Row.dedup\_key

> **dedup\_key**: `string` \| `null`

###### Tables.notifications.Row.id

> **id**: `string`

###### Tables.notifications.Row.read\_at

> **read\_at**: `string` \| `null`

###### Tables.notifications.Row.severity

> **severity**: `string`

###### Tables.notifications.Row.title

> **title**: `string`

###### Tables.notifications.Row.type

> **type**: `string`

###### Tables.notifications.Row.user\_id

> **user\_id**: `string`

###### Tables.notifications.Update

> **Update**: `object`

###### Tables.notifications.Update.body?

> `optional` **body?**: `string` \| `null`

###### Tables.notifications.Update.company\_id?

> `optional` **company\_id?**: `string`

###### Tables.notifications.Update.created\_at?

> `optional` **created\_at?**: `string`

###### Tables.notifications.Update.dedup\_key?

> `optional` **dedup\_key?**: `string` \| `null`

###### Tables.notifications.Update.id?

> `optional` **id?**: `string`

###### Tables.notifications.Update.read\_at?

> `optional` **read\_at?**: `string` \| `null`

###### Tables.notifications.Update.severity?

> `optional` **severity?**: `string`

###### Tables.notifications.Update.title?

> `optional` **title?**: `string`

###### Tables.notifications.Update.type?

> `optional` **type?**: `string`

###### Tables.notifications.Update.user\_id?

> `optional` **user\_id?**: `string`

###### Tables.order\_photos

> **order\_photos**: `object`

###### Tables.order\_photos.Insert

> **Insert**: `object`

###### Tables.order\_photos.Insert.caption?

> `optional` **caption?**: `string` \| `null`

###### Tables.order\_photos.Insert.company\_id

> **company\_id**: `string`

###### Tables.order\_photos.Insert.created\_at?

> `optional` **created\_at?**: `string`

###### Tables.order\_photos.Insert.id?

> `optional` **id?**: `string`

###### Tables.order\_photos.Insert.kind?

> `optional` **kind?**: `string` \| `null`

###### Tables.order\_photos.Insert.mime?

> `optional` **mime?**: `string` \| `null`

###### Tables.order\_photos.Insert.order\_id

> **order\_id**: `string`

###### Tables.order\_photos.Insert.path

> **path**: `string`

###### Tables.order\_photos.Insert.size\_bytes?

> `optional` **size\_bytes?**: `number` \| `null`

###### Tables.order\_photos.Insert.uploaded\_by?

> `optional` **uploaded\_by?**: `string` \| `null`

###### Tables.order\_photos.Relationships

> **Relationships**: \[\]

###### Tables.order\_photos.Row

> **Row**: `object`

###### Tables.order\_photos.Row.caption

> **caption**: `string` \| `null`

###### Tables.order\_photos.Row.company\_id

> **company\_id**: `string`

###### Tables.order\_photos.Row.created\_at

> **created\_at**: `string`

###### Tables.order\_photos.Row.id

> **id**: `string`

###### Tables.order\_photos.Row.kind

> **kind**: `string` \| `null`

###### Tables.order\_photos.Row.mime

> **mime**: `string` \| `null`

###### Tables.order\_photos.Row.order\_id

> **order\_id**: `string`

###### Tables.order\_photos.Row.path

> **path**: `string`

###### Tables.order\_photos.Row.size\_bytes

> **size\_bytes**: `number` \| `null`

###### Tables.order\_photos.Row.uploaded\_by

> **uploaded\_by**: `string` \| `null`

###### Tables.order\_photos.Update

> **Update**: `object`

###### Tables.order\_photos.Update.caption?

> `optional` **caption?**: `string` \| `null`

###### Tables.order\_photos.Update.company\_id?

> `optional` **company\_id?**: `string`

###### Tables.order\_photos.Update.created\_at?

> `optional` **created\_at?**: `string`

###### Tables.order\_photos.Update.id?

> `optional` **id?**: `string`

###### Tables.order\_photos.Update.kind?

> `optional` **kind?**: `string` \| `null`

###### Tables.order\_photos.Update.mime?

> `optional` **mime?**: `string` \| `null`

###### Tables.order\_photos.Update.order\_id?

> `optional` **order\_id?**: `string`

###### Tables.order\_photos.Update.path?

> `optional` **path?**: `string`

###### Tables.order\_photos.Update.size\_bytes?

> `optional` **size\_bytes?**: `number` \| `null`

###### Tables.order\_photos.Update.uploaded\_by?

> `optional` **uploaded\_by?**: `string` \| `null`

###### Tables.orders

> **orders**: `object`

###### Tables.orders.Insert

> **Insert**: `object`

###### Tables.orders.Insert.assigned\_to?

> `optional` **assigned\_to?**: `string` \| `null`

###### Tables.orders.Insert.cargo?

> `optional` **cargo?**: `string` \| `null`

###### Tables.orders.Insert.company\_id

> **company\_id**: `string`

###### Tables.orders.Insert.consignee?

> `optional` **consignee?**: `string` \| `null`

###### Tables.orders.Insert.created\_at?

> `optional` **created\_at?**: `string`

###### Tables.orders.Insert.currency?

> `optional` **currency?**: `string`

###### Tables.orders.Insert.destination?

> `optional` **destination?**: `string` \| `null`

###### Tables.orders.Insert.id?

> `optional` **id?**: `string`

###### Tables.orders.Insert.load\_date?

> `optional` **load\_date?**: `string` \| `null`

###### Tables.orders.Insert.notes?

> `optional` **notes?**: `string` \| `null`

###### Tables.orders.Insert.origin?

> `optional` **origin?**: `string` \| `null`

###### Tables.orders.Insert.price?

> `optional` **price?**: `number` \| `null`

###### Tables.orders.Insert.reference\_no?

> `optional` **reference\_no?**: `string` \| `null`

###### Tables.orders.Insert.shipper?

> `optional` **shipper?**: `string` \| `null`

###### Tables.orders.Insert.status?

> `optional` **status?**: `"new"` \| `"assigned"` \| `"in_progress"` \| `"delivered"` \| `"invoiced"` \| `"cancelled"`

###### Tables.orders.Insert.tracking\_token?

> `optional` **tracking\_token?**: `string`

###### Tables.orders.Insert.unload\_date?

> `optional` **unload\_date?**: `string` \| `null`

###### Tables.orders.Insert.updated\_at?

> `optional` **updated\_at?**: `string`

###### Tables.orders.Insert.vehicle\_id?

> `optional` **vehicle\_id?**: `string` \| `null`

###### Tables.orders.Insert.weight\_kg?

> `optional` **weight\_kg?**: `number` \| `null`

###### Tables.orders.Relationships

> **Relationships**: \[\]

###### Tables.orders.Row

> **Row**: `object`

###### Tables.orders.Row.assigned\_to

> **assigned\_to**: `string` \| `null`

###### Tables.orders.Row.cargo

> **cargo**: `string` \| `null`

###### Tables.orders.Row.company\_id

> **company\_id**: `string`

###### Tables.orders.Row.consignee

> **consignee**: `string` \| `null`

###### Tables.orders.Row.created\_at

> **created\_at**: `string`

###### Tables.orders.Row.currency

> **currency**: `string`

###### Tables.orders.Row.destination

> **destination**: `string` \| `null`

###### Tables.orders.Row.id

> **id**: `string`

###### Tables.orders.Row.load\_date

> **load\_date**: `string` \| `null`

###### Tables.orders.Row.notes

> **notes**: `string` \| `null`

###### Tables.orders.Row.origin

> **origin**: `string` \| `null`

###### Tables.orders.Row.price

> **price**: `number` \| `null`

###### Tables.orders.Row.reference\_no

> **reference\_no**: `string` \| `null`

###### Tables.orders.Row.shipper

> **shipper**: `string` \| `null`

###### Tables.orders.Row.status

> **status**: `"new"` \| `"assigned"` \| `"in_progress"` \| `"delivered"` \| `"invoiced"` \| `"cancelled"`

###### Tables.orders.Row.tracking\_token

> **tracking\_token**: `string`

###### Tables.orders.Row.unload\_date

> **unload\_date**: `string` \| `null`

###### Tables.orders.Row.updated\_at

> **updated\_at**: `string`

###### Tables.orders.Row.vehicle\_id

> **vehicle\_id**: `string` \| `null`

###### Tables.orders.Row.weight\_kg

> **weight\_kg**: `number` \| `null`

###### Tables.orders.Update

> **Update**: `object`

###### Tables.orders.Update.assigned\_to?

> `optional` **assigned\_to?**: `string` \| `null`

###### Tables.orders.Update.cargo?

> `optional` **cargo?**: `string` \| `null`

###### Tables.orders.Update.company\_id?

> `optional` **company\_id?**: `string`

###### Tables.orders.Update.consignee?

> `optional` **consignee?**: `string` \| `null`

###### Tables.orders.Update.created\_at?

> `optional` **created\_at?**: `string`

###### Tables.orders.Update.currency?

> `optional` **currency?**: `string`

###### Tables.orders.Update.destination?

> `optional` **destination?**: `string` \| `null`

###### Tables.orders.Update.id?

> `optional` **id?**: `string`

###### Tables.orders.Update.load\_date?

> `optional` **load\_date?**: `string` \| `null`

###### Tables.orders.Update.notes?

> `optional` **notes?**: `string` \| `null`

###### Tables.orders.Update.origin?

> `optional` **origin?**: `string` \| `null`

###### Tables.orders.Update.price?

> `optional` **price?**: `number` \| `null`

###### Tables.orders.Update.reference\_no?

> `optional` **reference\_no?**: `string` \| `null`

###### Tables.orders.Update.shipper?

> `optional` **shipper?**: `string` \| `null`

###### Tables.orders.Update.status?

> `optional` **status?**: `"new"` \| `"assigned"` \| `"in_progress"` \| `"delivered"` \| `"invoiced"` \| `"cancelled"`

###### Tables.orders.Update.tracking\_token?

> `optional` **tracking\_token?**: `string`

###### Tables.orders.Update.unload\_date?

> `optional` **unload\_date?**: `string` \| `null`

###### Tables.orders.Update.updated\_at?

> `optional` **updated\_at?**: `string`

###### Tables.orders.Update.vehicle\_id?

> `optional` **vehicle\_id?**: `string` \| `null`

###### Tables.orders.Update.weight\_kg?

> `optional` **weight\_kg?**: `number` \| `null`

###### Tables.parking\_reviews

> **parking\_reviews**: `object`

###### Tables.parking\_reviews.Insert

> **Insert**: `object`

###### Tables.parking\_reviews.Insert.created\_at?

> `optional` **created\_at?**: `string`

###### Tables.parking\_reviews.Insert.has\_food?

> `optional` **has\_food?**: `boolean`

###### Tables.parking\_reviews.Insert.has\_shower?

> `optional` **has\_shower?**: `boolean`

###### Tables.parking\_reviews.Insert.has\_wc?

> `optional` **has\_wc?**: `boolean`

###### Tables.parking\_reviews.Insert.id?

> `optional` **id?**: `string`

###### Tables.parking\_reviews.Insert.lat?

> `optional` **lat?**: `number` \| `null`

###### Tables.parking\_reviews.Insert.lng?

> `optional` **lng?**: `number` \| `null`

###### Tables.parking\_reviews.Insert.note?

> `optional` **note?**: `string` \| `null`

###### Tables.parking\_reviews.Insert.poi\_id

> **poi\_id**: `string`

###### Tables.parking\_reviews.Insert.poi\_name?

> `optional` **poi\_name?**: `string` \| `null`

###### Tables.parking\_reviews.Insert.rating

> **rating**: `number`

###### Tables.parking\_reviews.Insert.security?

> `optional` **security?**: `boolean`

###### Tables.parking\_reviews.Insert.updated\_at?

> `optional` **updated\_at?**: `string`

###### Tables.parking\_reviews.Insert.user\_id

> **user\_id**: `string`

###### Tables.parking\_reviews.Relationships

> **Relationships**: \[\]

###### Tables.parking\_reviews.Row

> **Row**: `object`

###### Tables.parking\_reviews.Row.created\_at

> **created\_at**: `string`

###### Tables.parking\_reviews.Row.has\_food

> **has\_food**: `boolean`

###### Tables.parking\_reviews.Row.has\_shower

> **has\_shower**: `boolean`

###### Tables.parking\_reviews.Row.has\_wc

> **has\_wc**: `boolean`

###### Tables.parking\_reviews.Row.id

> **id**: `string`

###### Tables.parking\_reviews.Row.lat

> **lat**: `number` \| `null`

###### Tables.parking\_reviews.Row.lng

> **lng**: `number` \| `null`

###### Tables.parking\_reviews.Row.note

> **note**: `string` \| `null`

###### Tables.parking\_reviews.Row.poi\_id

> **poi\_id**: `string`

###### Tables.parking\_reviews.Row.poi\_name

> **poi\_name**: `string` \| `null`

###### Tables.parking\_reviews.Row.rating

> **rating**: `number`

###### Tables.parking\_reviews.Row.security

> **security**: `boolean`

###### Tables.parking\_reviews.Row.updated\_at

> **updated\_at**: `string`

###### Tables.parking\_reviews.Row.user\_id

> **user\_id**: `string`

###### Tables.parking\_reviews.Update

> **Update**: `object`

###### Tables.parking\_reviews.Update.created\_at?

> `optional` **created\_at?**: `string`

###### Tables.parking\_reviews.Update.has\_food?

> `optional` **has\_food?**: `boolean`

###### Tables.parking\_reviews.Update.has\_shower?

> `optional` **has\_shower?**: `boolean`

###### Tables.parking\_reviews.Update.has\_wc?

> `optional` **has\_wc?**: `boolean`

###### Tables.parking\_reviews.Update.id?

> `optional` **id?**: `string`

###### Tables.parking\_reviews.Update.lat?

> `optional` **lat?**: `number` \| `null`

###### Tables.parking\_reviews.Update.lng?

> `optional` **lng?**: `number` \| `null`

###### Tables.parking\_reviews.Update.note?

> `optional` **note?**: `string` \| `null`

###### Tables.parking\_reviews.Update.poi\_id?

> `optional` **poi\_id?**: `string`

###### Tables.parking\_reviews.Update.poi\_name?

> `optional` **poi\_name?**: `string` \| `null`

###### Tables.parking\_reviews.Update.rating?

> `optional` **rating?**: `number`

###### Tables.parking\_reviews.Update.security?

> `optional` **security?**: `boolean`

###### Tables.parking\_reviews.Update.updated\_at?

> `optional` **updated\_at?**: `string`

###### Tables.parking\_reviews.Update.user\_id?

> `optional` **user\_id?**: `string`

###### Tables.passkeys

> **passkeys**: `object`

###### Tables.passkeys.Insert

> **Insert**: `object`

###### Tables.passkeys.Insert.counter?

> `optional` **counter?**: `number`

###### Tables.passkeys.Insert.created\_at?

> `optional` **created\_at?**: `string`

###### Tables.passkeys.Insert.credential\_id

> **credential\_id**: `string`

###### Tables.passkeys.Insert.id?

> `optional` **id?**: `string`

###### Tables.passkeys.Insert.name?

> `optional` **name?**: `string` \| `null`

###### Tables.passkeys.Insert.public\_key

> **public\_key**: `string`

###### Tables.passkeys.Insert.transports?

> `optional` **transports?**: `string`[] \| `null`

###### Tables.passkeys.Insert.user\_id

> **user\_id**: `string`

###### Tables.passkeys.Relationships

> **Relationships**: \[\]

###### Tables.passkeys.Row

> **Row**: `object`

###### Tables.passkeys.Row.counter

> **counter**: `number`

###### Tables.passkeys.Row.created\_at

> **created\_at**: `string`

###### Tables.passkeys.Row.credential\_id

> **credential\_id**: `string`

###### Tables.passkeys.Row.id

> **id**: `string`

###### Tables.passkeys.Row.name

> **name**: `string` \| `null`

###### Tables.passkeys.Row.public\_key

> **public\_key**: `string`

###### Tables.passkeys.Row.transports

> **transports**: `string`[] \| `null`

###### Tables.passkeys.Row.user\_id

> **user\_id**: `string`

###### Tables.passkeys.Update

> **Update**: `object`

###### Tables.passkeys.Update.counter?

> `optional` **counter?**: `number`

###### Tables.passkeys.Update.created\_at?

> `optional` **created\_at?**: `string`

###### Tables.passkeys.Update.credential\_id?

> `optional` **credential\_id?**: `string`

###### Tables.passkeys.Update.id?

> `optional` **id?**: `string`

###### Tables.passkeys.Update.name?

> `optional` **name?**: `string` \| `null`

###### Tables.passkeys.Update.public\_key?

> `optional` **public\_key?**: `string`

###### Tables.passkeys.Update.transports?

> `optional` **transports?**: `string`[] \| `null`

###### Tables.passkeys.Update.user\_id?

> `optional` **user\_id?**: `string`

###### Tables.per\_diem\_trips

> **per\_diem\_trips**: `object`

###### Tables.per\_diem\_trips.Insert

> **Insert**: `object`

###### Tables.per\_diem\_trips.Insert.company\_id

> **company\_id**: `string`

###### Tables.per\_diem\_trips.Insert.created\_at?

> `optional` **created\_at?**: `string`

###### Tables.per\_diem\_trips.Insert.created\_by?

> `optional` **created\_by?**: `string` \| `null`

###### Tables.per\_diem\_trips.Insert.currency?

> `optional` **currency?**: `string`

###### Tables.per\_diem\_trips.Insert.daily\_rate

> **daily\_rate**: `number`

###### Tables.per\_diem\_trips.Insert.destination?

> `optional` **destination?**: `string` \| `null`

###### Tables.per\_diem\_trips.Insert.driver\_id?

> `optional` **driver\_id?**: `string` \| `null`

###### Tables.per\_diem\_trips.Insert.driver\_name?

> `optional` **driver\_name?**: `string` \| `null`

###### Tables.per\_diem\_trips.Insert.hours

> **hours**: `number`

###### Tables.per\_diem\_trips.Insert.id?

> `optional` **id?**: `string`

###### Tables.per\_diem\_trips.Insert.mode

> **mode**: `string`

###### Tables.per\_diem\_trips.Insert.note?

> `optional` **note?**: `string` \| `null`

###### Tables.per\_diem\_trips.Insert.trip\_date?

> `optional` **trip\_date?**: `string` \| `null`

###### Tables.per\_diem\_trips.Relationships

> **Relationships**: \[\]

###### Tables.per\_diem\_trips.Row

> **Row**: `object`

###### Tables.per\_diem\_trips.Row.company\_id

> **company\_id**: `string`

###### Tables.per\_diem\_trips.Row.created\_at

> **created\_at**: `string`

###### Tables.per\_diem\_trips.Row.created\_by

> **created\_by**: `string` \| `null`

###### Tables.per\_diem\_trips.Row.currency

> **currency**: `string`

###### Tables.per\_diem\_trips.Row.daily\_rate

> **daily\_rate**: `number`

###### Tables.per\_diem\_trips.Row.destination

> **destination**: `string` \| `null`

###### Tables.per\_diem\_trips.Row.driver\_id

> **driver\_id**: `string` \| `null`

###### Tables.per\_diem\_trips.Row.driver\_name

> **driver\_name**: `string` \| `null`

###### Tables.per\_diem\_trips.Row.hours

> **hours**: `number`

###### Tables.per\_diem\_trips.Row.id

> **id**: `string`

###### Tables.per\_diem\_trips.Row.mode

> **mode**: `string`

###### Tables.per\_diem\_trips.Row.note

> **note**: `string` \| `null`

###### Tables.per\_diem\_trips.Row.trip\_date

> **trip\_date**: `string` \| `null`

###### Tables.per\_diem\_trips.Update

> **Update**: `object`

###### Tables.per\_diem\_trips.Update.company\_id?

> `optional` **company\_id?**: `string`

###### Tables.per\_diem\_trips.Update.created\_at?

> `optional` **created\_at?**: `string`

###### Tables.per\_diem\_trips.Update.created\_by?

> `optional` **created\_by?**: `string` \| `null`

###### Tables.per\_diem\_trips.Update.currency?

> `optional` **currency?**: `string`

###### Tables.per\_diem\_trips.Update.daily\_rate?

> `optional` **daily\_rate?**: `number`

###### Tables.per\_diem\_trips.Update.destination?

> `optional` **destination?**: `string` \| `null`

###### Tables.per\_diem\_trips.Update.driver\_id?

> `optional` **driver\_id?**: `string` \| `null`

###### Tables.per\_diem\_trips.Update.driver\_name?

> `optional` **driver\_name?**: `string` \| `null`

###### Tables.per\_diem\_trips.Update.hours?

> `optional` **hours?**: `number`

###### Tables.per\_diem\_trips.Update.id?

> `optional` **id?**: `string`

###### Tables.per\_diem\_trips.Update.mode?

> `optional` **mode?**: `string`

###### Tables.per\_diem\_trips.Update.note?

> `optional` **note?**: `string` \| `null`

###### Tables.per\_diem\_trips.Update.trip\_date?

> `optional` **trip\_date?**: `string` \| `null`

###### Tables.poi\_reviews

> **poi\_reviews**: `object`

###### Tables.poi\_reviews.Insert

> **Insert**: `object`

###### Tables.poi\_reviews.Insert.comment?

> `optional` **comment?**: `string` \| `null`

###### Tables.poi\_reviews.Insert.created\_at?

> `optional` **created\_at?**: `string`

###### Tables.poi\_reviews.Insert.id?

> `optional` **id?**: `string`

###### Tables.poi\_reviews.Insert.poi\_id

> **poi\_id**: `string`

###### Tables.poi\_reviews.Insert.rating?

> `optional` **rating?**: `number` \| `null`

###### Tables.poi\_reviews.Insert.safety?

> `optional` **safety?**: `number` \| `null`

###### Tables.poi\_reviews.Insert.user\_id

> **user\_id**: `string`

###### Tables.poi\_reviews.Relationships

> **Relationships**: \[\]

###### Tables.poi\_reviews.Row

> **Row**: `object`

###### Tables.poi\_reviews.Row.comment

> **comment**: `string` \| `null`

###### Tables.poi\_reviews.Row.created\_at

> **created\_at**: `string`

###### Tables.poi\_reviews.Row.id

> **id**: `string`

###### Tables.poi\_reviews.Row.poi\_id

> **poi\_id**: `string`

###### Tables.poi\_reviews.Row.rating

> **rating**: `number` \| `null`

###### Tables.poi\_reviews.Row.safety

> **safety**: `number` \| `null`

###### Tables.poi\_reviews.Row.user\_id

> **user\_id**: `string`

###### Tables.poi\_reviews.Update

> **Update**: `object`

###### Tables.poi\_reviews.Update.comment?

> `optional` **comment?**: `string` \| `null`

###### Tables.poi\_reviews.Update.created\_at?

> `optional` **created\_at?**: `string`

###### Tables.poi\_reviews.Update.id?

> `optional` **id?**: `string`

###### Tables.poi\_reviews.Update.poi\_id?

> `optional` **poi\_id?**: `string`

###### Tables.poi\_reviews.Update.rating?

> `optional` **rating?**: `number` \| `null`

###### Tables.poi\_reviews.Update.safety?

> `optional` **safety?**: `number` \| `null`

###### Tables.poi\_reviews.Update.user\_id?

> `optional` **user\_id?**: `string`

###### Tables.pois

> **pois**: `object`

###### Tables.pois.Insert

> **Insert**: `object`

###### Tables.pois.Insert.accepts?

> `optional` **accepts?**: [`Json`](../api/api/src.md#json)

###### Tables.pois.Insert.address?

> `optional` **address?**: `string` \| `null`

###### Tables.pois.Insert.amenities?

> `optional` **amenities?**: [`Json`](../api/api/src.md#json)

###### Tables.pois.Insert.country?

> `optional` **country?**: `string` \| `null`

###### Tables.pois.Insert.created\_at?

> `optional` **created\_at?**: `string`

###### Tables.pois.Insert.geo

> **geo**: `unknown`

###### Tables.pois.Insert.id?

> `optional` **id?**: `string`

###### Tables.pois.Insert.name?

> `optional` **name?**: `string` \| `null`

###### Tables.pois.Insert.rating\_avg?

> `optional` **rating\_avg?**: `number` \| `null`

###### Tables.pois.Insert.source?

> `optional` **source?**: `string` \| `null`

###### Tables.pois.Insert.type

> **type**: `"parking"` \| `"fuel_station"` \| `"ferry"` \| `"airport"` \| `"company"` \| `"wash"` \| `"weigh"`

###### Tables.pois.Relationships

> **Relationships**: \[\]

###### Tables.pois.Row

> **Row**: `object`

###### Tables.pois.Row.accepts

> **accepts**: [`Json`](../api/api/src.md#json)

###### Tables.pois.Row.address

> **address**: `string` \| `null`

###### Tables.pois.Row.amenities

> **amenities**: [`Json`](../api/api/src.md#json)

###### Tables.pois.Row.country

> **country**: `string` \| `null`

###### Tables.pois.Row.created\_at

> **created\_at**: `string`

###### Tables.pois.Row.geo

> **geo**: `unknown`

###### Tables.pois.Row.id

> **id**: `string`

###### Tables.pois.Row.name

> **name**: `string` \| `null`

###### Tables.pois.Row.rating\_avg

> **rating\_avg**: `number` \| `null`

###### Tables.pois.Row.source

> **source**: `string` \| `null`

###### Tables.pois.Row.type

> **type**: `"parking"` \| `"fuel_station"` \| `"ferry"` \| `"airport"` \| `"company"` \| `"wash"` \| `"weigh"`

###### Tables.pois.Update

> **Update**: `object`

###### Tables.pois.Update.accepts?

> `optional` **accepts?**: [`Json`](../api/api/src.md#json)

###### Tables.pois.Update.address?

> `optional` **address?**: `string` \| `null`

###### Tables.pois.Update.amenities?

> `optional` **amenities?**: [`Json`](../api/api/src.md#json)

###### Tables.pois.Update.country?

> `optional` **country?**: `string` \| `null`

###### Tables.pois.Update.created\_at?

> `optional` **created\_at?**: `string`

###### Tables.pois.Update.geo?

> `optional` **geo?**: `unknown`

###### Tables.pois.Update.id?

> `optional` **id?**: `string`

###### Tables.pois.Update.name?

> `optional` **name?**: `string` \| `null`

###### Tables.pois.Update.rating\_avg?

> `optional` **rating\_avg?**: `number` \| `null`

###### Tables.pois.Update.source?

> `optional` **source?**: `string` \| `null`

###### Tables.pois.Update.type?

> `optional` **type?**: `"parking"` \| `"fuel_station"` \| `"ferry"` \| `"airport"` \| `"company"` \| `"wash"` \| `"weigh"`

###### Tables.profiles

> **profiles**: `object`

###### Tables.profiles.Insert

> **Insert**: `object`

###### Tables.profiles.Insert.created\_at?

> `optional` **created\_at?**: `string`

###### Tables.profiles.Insert.email\_enc?

> `optional` **email\_enc?**: `string` \| `null`

###### Tables.profiles.Insert.full\_name\_enc?

> `optional` **full\_name\_enc?**: `string` \| `null`

###### Tables.profiles.Insert.id

> **id**: `string`

###### Tables.profiles.Insert.locale?

> `optional` **locale?**: `string` \| `null`

###### Tables.profiles.Insert.mfa\_enabled?

> `optional` **mfa\_enabled?**: `boolean`

###### Tables.profiles.Insert.phone\_enc?

> `optional` **phone\_enc?**: `string` \| `null`

###### Tables.profiles.Insert.updated\_at?

> `optional` **updated\_at?**: `string`

###### Tables.profiles.Relationships

> **Relationships**: \[\]

###### Tables.profiles.Row

> **Row**: `object`

###### Tables.profiles.Row.created\_at

> **created\_at**: `string`

###### Tables.profiles.Row.email\_enc

> **email\_enc**: `string` \| `null`

###### Tables.profiles.Row.full\_name\_enc

> **full\_name\_enc**: `string` \| `null`

###### Tables.profiles.Row.id

> **id**: `string`

###### Tables.profiles.Row.locale

> **locale**: `string` \| `null`

###### Tables.profiles.Row.mfa\_enabled

> **mfa\_enabled**: `boolean`

###### Tables.profiles.Row.phone\_enc

> **phone\_enc**: `string` \| `null`

###### Tables.profiles.Row.updated\_at

> **updated\_at**: `string`

###### Tables.profiles.Update

> **Update**: `object`

###### Tables.profiles.Update.created\_at?

> `optional` **created\_at?**: `string`

###### Tables.profiles.Update.email\_enc?

> `optional` **email\_enc?**: `string` \| `null`

###### Tables.profiles.Update.full\_name\_enc?

> `optional` **full\_name\_enc?**: `string` \| `null`

###### Tables.profiles.Update.id?

> `optional` **id?**: `string`

###### Tables.profiles.Update.locale?

> `optional` **locale?**: `string` \| `null`

###### Tables.profiles.Update.mfa\_enabled?

> `optional` **mfa\_enabled?**: `boolean`

###### Tables.profiles.Update.phone\_enc?

> `optional` **phone\_enc?**: `string` \| `null`

###### Tables.profiles.Update.updated\_at?

> `optional` **updated\_at?**: `string`

###### Tables.push\_subscriptions

> **push\_subscriptions**: `object`

###### Tables.push\_subscriptions.Insert

> **Insert**: `object`

###### Tables.push\_subscriptions.Insert.auth

> **auth**: `string`

###### Tables.push\_subscriptions.Insert.company\_id?

> `optional` **company\_id?**: `string` \| `null`

###### Tables.push\_subscriptions.Insert.created\_at?

> `optional` **created\_at?**: `string`

###### Tables.push\_subscriptions.Insert.endpoint

> **endpoint**: `string`

###### Tables.push\_subscriptions.Insert.id?

> `optional` **id?**: `string`

###### Tables.push\_subscriptions.Insert.p256dh

> **p256dh**: `string`

###### Tables.push\_subscriptions.Insert.user\_agent?

> `optional` **user\_agent?**: `string` \| `null`

###### Tables.push\_subscriptions.Insert.user\_id

> **user\_id**: `string`

###### Tables.push\_subscriptions.Relationships

> **Relationships**: \[\]

###### Tables.push\_subscriptions.Row

> **Row**: `object`

###### Tables.push\_subscriptions.Row.auth

> **auth**: `string`

###### Tables.push\_subscriptions.Row.company\_id

> **company\_id**: `string` \| `null`

###### Tables.push\_subscriptions.Row.created\_at

> **created\_at**: `string`

###### Tables.push\_subscriptions.Row.endpoint

> **endpoint**: `string`

###### Tables.push\_subscriptions.Row.id

> **id**: `string`

###### Tables.push\_subscriptions.Row.p256dh

> **p256dh**: `string`

###### Tables.push\_subscriptions.Row.user\_agent

> **user\_agent**: `string` \| `null`

###### Tables.push\_subscriptions.Row.user\_id

> **user\_id**: `string`

###### Tables.push\_subscriptions.Update

> **Update**: `object`

###### Tables.push\_subscriptions.Update.auth?

> `optional` **auth?**: `string`

###### Tables.push\_subscriptions.Update.company\_id?

> `optional` **company\_id?**: `string` \| `null`

###### Tables.push\_subscriptions.Update.created\_at?

> `optional` **created\_at?**: `string`

###### Tables.push\_subscriptions.Update.endpoint?

> `optional` **endpoint?**: `string`

###### Tables.push\_subscriptions.Update.id?

> `optional` **id?**: `string`

###### Tables.push\_subscriptions.Update.p256dh?

> `optional` **p256dh?**: `string`

###### Tables.push\_subscriptions.Update.user\_agent?

> `optional` **user\_agent?**: `string` \| `null`

###### Tables.push\_subscriptions.Update.user\_id?

> `optional` **user\_id?**: `string`

###### Tables.rates

> **rates**: `object`

###### Tables.rates.Insert

> **Insert**: `object`

###### Tables.rates.Insert.company\_id

> **company\_id**: `string`

###### Tables.rates.Insert.currency?

> `optional` **currency?**: `string`

###### Tables.rates.Insert.id?

> `optional` **id?**: `string`

###### Tables.rates.Insert.rate\_per\_km

> **rate\_per\_km**: `number`

###### Tables.rates.Insert.valid\_from?

> `optional` **valid\_from?**: `string`

###### Tables.rates.Insert.vehicle\_id?

> `optional` **vehicle\_id?**: `string` \| `null`

###### Tables.rates.Relationships

> **Relationships**: \[\]

###### Tables.rates.Row

> **Row**: `object`

###### Tables.rates.Row.company\_id

> **company\_id**: `string`

###### Tables.rates.Row.currency

> **currency**: `string`

###### Tables.rates.Row.id

> **id**: `string`

###### Tables.rates.Row.rate\_per\_km

> **rate\_per\_km**: `number`

###### Tables.rates.Row.valid\_from

> **valid\_from**: `string`

###### Tables.rates.Row.vehicle\_id

> **vehicle\_id**: `string` \| `null`

###### Tables.rates.Update

> **Update**: `object`

###### Tables.rates.Update.company\_id?

> `optional` **company\_id?**: `string`

###### Tables.rates.Update.currency?

> `optional` **currency?**: `string`

###### Tables.rates.Update.id?

> `optional` **id?**: `string`

###### Tables.rates.Update.rate\_per\_km?

> `optional` **rate\_per\_km?**: `number`

###### Tables.rates.Update.valid\_from?

> `optional` **valid\_from?**: `string`

###### Tables.rates.Update.vehicle\_id?

> `optional` **vehicle\_id?**: `string` \| `null`

###### Tables.saved\_places

> **saved\_places**: `object`

###### Tables.saved\_places.Insert

> **Insert**: `object`

###### Tables.saved\_places.Insert.category?

> `optional` **category?**: `string`

###### Tables.saved\_places.Insert.company\_id

> **company\_id**: `string`

###### Tables.saved\_places.Insert.created\_at?

> `optional` **created\_at?**: `string`

###### Tables.saved\_places.Insert.created\_by?

> `optional` **created\_by?**: `string` \| `null`

###### Tables.saved\_places.Insert.id?

> `optional` **id?**: `string`

###### Tables.saved\_places.Insert.lat

> **lat**: `number`

###### Tables.saved\_places.Insert.lng

> **lng**: `number`

###### Tables.saved\_places.Insert.name

> **name**: `string`

###### Tables.saved\_places.Relationships

> **Relationships**: \[\]

###### Tables.saved\_places.Row

> **Row**: `object`

###### Tables.saved\_places.Row.category

> **category**: `string`

###### Tables.saved\_places.Row.company\_id

> **company\_id**: `string`

###### Tables.saved\_places.Row.created\_at

> **created\_at**: `string`

###### Tables.saved\_places.Row.created\_by

> **created\_by**: `string` \| `null`

###### Tables.saved\_places.Row.id

> **id**: `string`

###### Tables.saved\_places.Row.lat

> **lat**: `number`

###### Tables.saved\_places.Row.lng

> **lng**: `number`

###### Tables.saved\_places.Row.name

> **name**: `string`

###### Tables.saved\_places.Update

> **Update**: `object`

###### Tables.saved\_places.Update.category?

> `optional` **category?**: `string`

###### Tables.saved\_places.Update.company\_id?

> `optional` **company\_id?**: `string`

###### Tables.saved\_places.Update.created\_at?

> `optional` **created\_at?**: `string`

###### Tables.saved\_places.Update.created\_by?

> `optional` **created\_by?**: `string` \| `null`

###### Tables.saved\_places.Update.id?

> `optional` **id?**: `string`

###### Tables.saved\_places.Update.lat?

> `optional` **lat?**: `number`

###### Tables.saved\_places.Update.lng?

> `optional` **lng?**: `number`

###### Tables.saved\_places.Update.name?

> `optional` **name?**: `string`

###### Tables.service\_tasks

> **service\_tasks**: `object`

###### Tables.service\_tasks.Insert

> **Insert**: `object`

###### Tables.service\_tasks.Insert.company\_id

> **company\_id**: `string`

###### Tables.service\_tasks.Insert.created\_at?

> `optional` **created\_at?**: `string`

###### Tables.service\_tasks.Insert.id?

> `optional` **id?**: `string`

###### Tables.service\_tasks.Insert.interval\_km?

> `optional` **interval\_km?**: `number` \| `null`

###### Tables.service\_tasks.Insert.interval\_months?

> `optional` **interval\_months?**: `number` \| `null`

###### Tables.service\_tasks.Insert.last\_done\_date?

> `optional` **last\_done\_date?**: `string` \| `null`

###### Tables.service\_tasks.Insert.last\_done\_km?

> `optional` **last\_done\_km?**: `number` \| `null`

###### Tables.service\_tasks.Insert.name

> **name**: `string`

###### Tables.service\_tasks.Insert.notes?

> `optional` **notes?**: `string` \| `null`

###### Tables.service\_tasks.Insert.updated\_at?

> `optional` **updated\_at?**: `string`

###### Tables.service\_tasks.Insert.vehicle\_id

> **vehicle\_id**: `string`

###### Tables.service\_tasks.Relationships

> **Relationships**: \[\]

###### Tables.service\_tasks.Row

> **Row**: `object`

###### Tables.service\_tasks.Row.company\_id

> **company\_id**: `string`

###### Tables.service\_tasks.Row.created\_at

> **created\_at**: `string`

###### Tables.service\_tasks.Row.id

> **id**: `string`

###### Tables.service\_tasks.Row.interval\_km

> **interval\_km**: `number` \| `null`

###### Tables.service\_tasks.Row.interval\_months

> **interval\_months**: `number` \| `null`

###### Tables.service\_tasks.Row.last\_done\_date

> **last\_done\_date**: `string` \| `null`

###### Tables.service\_tasks.Row.last\_done\_km

> **last\_done\_km**: `number` \| `null`

###### Tables.service\_tasks.Row.name

> **name**: `string`

###### Tables.service\_tasks.Row.notes

> **notes**: `string` \| `null`

###### Tables.service\_tasks.Row.updated\_at

> **updated\_at**: `string`

###### Tables.service\_tasks.Row.vehicle\_id

> **vehicle\_id**: `string`

###### Tables.service\_tasks.Update

> **Update**: `object`

###### Tables.service\_tasks.Update.company\_id?

> `optional` **company\_id?**: `string`

###### Tables.service\_tasks.Update.created\_at?

> `optional` **created\_at?**: `string`

###### Tables.service\_tasks.Update.id?

> `optional` **id?**: `string`

###### Tables.service\_tasks.Update.interval\_km?

> `optional` **interval\_km?**: `number` \| `null`

###### Tables.service\_tasks.Update.interval\_months?

> `optional` **interval\_months?**: `number` \| `null`

###### Tables.service\_tasks.Update.last\_done\_date?

> `optional` **last\_done\_date?**: `string` \| `null`

###### Tables.service\_tasks.Update.last\_done\_km?

> `optional` **last\_done\_km?**: `number` \| `null`

###### Tables.service\_tasks.Update.name?

> `optional` **name?**: `string`

###### Tables.service\_tasks.Update.notes?

> `optional` **notes?**: `string` \| `null`

###### Tables.service\_tasks.Update.updated\_at?

> `optional` **updated\_at?**: `string`

###### Tables.service\_tasks.Update.vehicle\_id?

> `optional` **vehicle\_id?**: `string`

###### Tables.trip\_event\_revisions

> **trip\_event\_revisions**: `object`

###### Tables.trip\_event\_revisions.Insert

> **Insert**: `object`

###### Tables.trip\_event\_revisions.Insert.edited\_at?

> `optional` **edited\_at?**: `string`

###### Tables.trip\_event\_revisions.Insert.edited\_by?

> `optional` **edited\_by?**: `string` \| `null`

###### Tables.trip\_event\_revisions.Insert.id?

> `optional` **id?**: `string`

###### Tables.trip\_event\_revisions.Insert.revision

> **revision**: `number`

###### Tables.trip\_event\_revisions.Insert.snapshot

> **snapshot**: [`Json`](../api/api/src.md#json)

###### Tables.trip\_event\_revisions.Insert.trip\_event\_id

> **trip\_event\_id**: `string`

###### Tables.trip\_event\_revisions.Relationships

> **Relationships**: \[\]

###### Tables.trip\_event\_revisions.Row

> **Row**: `object`

###### Tables.trip\_event\_revisions.Row.edited\_at

> **edited\_at**: `string`

###### Tables.trip\_event\_revisions.Row.edited\_by

> **edited\_by**: `string` \| `null`

###### Tables.trip\_event\_revisions.Row.id

> **id**: `string`

###### Tables.trip\_event\_revisions.Row.revision

> **revision**: `number`

###### Tables.trip\_event\_revisions.Row.snapshot

> **snapshot**: [`Json`](../api/api/src.md#json)

###### Tables.trip\_event\_revisions.Row.trip\_event\_id

> **trip\_event\_id**: `string`

###### Tables.trip\_event\_revisions.Update

> **Update**: `object`

###### Tables.trip\_event\_revisions.Update.edited\_at?

> `optional` **edited\_at?**: `string`

###### Tables.trip\_event\_revisions.Update.edited\_by?

> `optional` **edited\_by?**: `string` \| `null`

###### Tables.trip\_event\_revisions.Update.id?

> `optional` **id?**: `string`

###### Tables.trip\_event\_revisions.Update.revision?

> `optional` **revision?**: `number`

###### Tables.trip\_event\_revisions.Update.snapshot?

> `optional` **snapshot?**: [`Json`](../api/api/src.md#json)

###### Tables.trip\_event\_revisions.Update.trip\_event\_id?

> `optional` **trip\_event\_id?**: `string`

###### Tables.trip\_events

> **trip\_events**: `object`

###### Tables.trip\_events.Insert

> **Insert**: `object`

###### Tables.trip\_events.Insert.action

> **action**: `"other"` \| `"load"` \| `"unload"` \| `"transshipment"` \| `"start"` \| `"end"` \| `"service"`

###### Tables.trip\_events.Insert.amount?

> `optional` **amount?**: `number` \| `null`

###### Tables.trip\_events.Insert.comment?

> `optional` **comment?**: `string` \| `null`

###### Tables.trip\_events.Insert.company?

> `optional` **company?**: `string` \| `null`

###### Tables.trip\_events.Insert.company\_id

> **company\_id**: `string`

###### Tables.trip\_events.Insert.country

> **country**: `string`

###### Tables.trip\_events.Insert.created\_at?

> `optional` **created\_at?**: `string`

###### Tables.trip\_events.Insert.device\_id?

> `optional` **device\_id?**: `string` \| `null`

###### Tables.trip\_events.Insert.driver\_id

> **driver\_id**: `string`

###### Tables.trip\_events.Insert.from\_vehicle\_reg?

> `optional` **from\_vehicle\_reg?**: `string` \| `null`

###### Tables.trip\_events.Insert.geo?

> `optional` **geo?**: `unknown`

###### Tables.trip\_events.Insert.id

> **id**: `string`

###### Tables.trip\_events.Insert.location?

> `optional` **location?**: `string` \| `null`

###### Tables.trip\_events.Insert.odometer\_km

> **odometer\_km**: `number`

###### Tables.trip\_events.Insert.order\_id?

> `optional` **order\_id?**: `string` \| `null`

###### Tables.trip\_events.Insert.postcode?

> `optional` **postcode?**: `string` \| `null`

###### Tables.trip\_events.Insert.revision?

> `optional` **revision?**: `number`

###### Tables.trip\_events.Insert.synced\_at?

> `optional` **synced\_at?**: `string` \| `null`

###### Tables.trip\_events.Insert.to\_vehicle\_reg?

> `optional` **to\_vehicle\_reg?**: `string` \| `null`

###### Tables.trip\_events.Insert.updated\_at?

> `optional` **updated\_at?**: `string`

###### Tables.trip\_events.Insert.vehicle\_id

> **vehicle\_id**: `string`

###### Tables.trip\_events.Insert.weight\_kg?

> `optional` **weight\_kg?**: `number` \| `null`

###### Tables.trip\_events.Relationships

> **Relationships**: \[\]

###### Tables.trip\_events.Row

> **Row**: `object`

###### Tables.trip\_events.Row.action

> **action**: `"other"` \| `"load"` \| `"unload"` \| `"transshipment"` \| `"start"` \| `"end"` \| `"service"`

###### Tables.trip\_events.Row.amount

> **amount**: `number` \| `null`

###### Tables.trip\_events.Row.comment

> **comment**: `string` \| `null`

###### Tables.trip\_events.Row.company

> **company**: `string` \| `null`

###### Tables.trip\_events.Row.company\_id

> **company\_id**: `string`

###### Tables.trip\_events.Row.country

> **country**: `string`

###### Tables.trip\_events.Row.created\_at

> **created\_at**: `string`

###### Tables.trip\_events.Row.device\_id

> **device\_id**: `string` \| `null`

###### Tables.trip\_events.Row.driver\_id

> **driver\_id**: `string`

###### Tables.trip\_events.Row.from\_vehicle\_reg

> **from\_vehicle\_reg**: `string` \| `null`

###### Tables.trip\_events.Row.geo

> **geo**: `unknown`

###### Tables.trip\_events.Row.id

> **id**: `string`

###### Tables.trip\_events.Row.location

> **location**: `string` \| `null`

###### Tables.trip\_events.Row.odometer\_km

> **odometer\_km**: `number`

###### Tables.trip\_events.Row.order\_id

> **order\_id**: `string` \| `null`

###### Tables.trip\_events.Row.postcode

> **postcode**: `string` \| `null`

###### Tables.trip\_events.Row.revision

> **revision**: `number`

###### Tables.trip\_events.Row.synced\_at

> **synced\_at**: `string` \| `null`

###### Tables.trip\_events.Row.to\_vehicle\_reg

> **to\_vehicle\_reg**: `string` \| `null`

###### Tables.trip\_events.Row.updated\_at

> **updated\_at**: `string`

###### Tables.trip\_events.Row.vehicle\_id

> **vehicle\_id**: `string`

###### Tables.trip\_events.Row.weight\_kg

> **weight\_kg**: `number` \| `null`

###### Tables.trip\_events.Update

> **Update**: `object`

###### Tables.trip\_events.Update.action?

> `optional` **action?**: `"other"` \| `"load"` \| `"unload"` \| `"transshipment"` \| `"start"` \| `"end"` \| `"service"`

###### Tables.trip\_events.Update.amount?

> `optional` **amount?**: `number` \| `null`

###### Tables.trip\_events.Update.comment?

> `optional` **comment?**: `string` \| `null`

###### Tables.trip\_events.Update.company?

> `optional` **company?**: `string` \| `null`

###### Tables.trip\_events.Update.company\_id?

> `optional` **company\_id?**: `string`

###### Tables.trip\_events.Update.country?

> `optional` **country?**: `string`

###### Tables.trip\_events.Update.created\_at?

> `optional` **created\_at?**: `string`

###### Tables.trip\_events.Update.device\_id?

> `optional` **device\_id?**: `string` \| `null`

###### Tables.trip\_events.Update.driver\_id?

> `optional` **driver\_id?**: `string`

###### Tables.trip\_events.Update.from\_vehicle\_reg?

> `optional` **from\_vehicle\_reg?**: `string` \| `null`

###### Tables.trip\_events.Update.geo?

> `optional` **geo?**: `unknown`

###### Tables.trip\_events.Update.id?

> `optional` **id?**: `string`

###### Tables.trip\_events.Update.location?

> `optional` **location?**: `string` \| `null`

###### Tables.trip\_events.Update.odometer\_km?

> `optional` **odometer\_km?**: `number`

###### Tables.trip\_events.Update.order\_id?

> `optional` **order\_id?**: `string` \| `null`

###### Tables.trip\_events.Update.postcode?

> `optional` **postcode?**: `string` \| `null`

###### Tables.trip\_events.Update.revision?

> `optional` **revision?**: `number`

###### Tables.trip\_events.Update.synced\_at?

> `optional` **synced\_at?**: `string` \| `null`

###### Tables.trip\_events.Update.to\_vehicle\_reg?

> `optional` **to\_vehicle\_reg?**: `string` \| `null`

###### Tables.trip\_events.Update.updated\_at?

> `optional` **updated\_at?**: `string`

###### Tables.trip\_events.Update.vehicle\_id?

> `optional` **vehicle\_id?**: `string`

###### Tables.trip\_events.Update.weight\_kg?

> `optional` **weight\_kg?**: `number` \| `null`

###### Tables.vehicle\_costs

> **vehicle\_costs**: `object`

###### Tables.vehicle\_costs.Insert

> **Insert**: `object`

###### Tables.vehicle\_costs.Insert.amount

> **amount**: `number`

###### Tables.vehicle\_costs.Insert.category

> **category**: `string`

###### Tables.vehicle\_costs.Insert.company\_id

> **company\_id**: `string`

###### Tables.vehicle\_costs.Insert.cost\_date?

> `optional` **cost\_date?**: `string`

###### Tables.vehicle\_costs.Insert.created\_at?

> `optional` **created\_at?**: `string`

###### Tables.vehicle\_costs.Insert.currency?

> `optional` **currency?**: `string`

###### Tables.vehicle\_costs.Insert.description?

> `optional` **description?**: `string` \| `null`

###### Tables.vehicle\_costs.Insert.id?

> `optional` **id?**: `string`

###### Tables.vehicle\_costs.Insert.vehicle\_id

> **vehicle\_id**: `string`

###### Tables.vehicle\_costs.Relationships

> **Relationships**: \[\]

###### Tables.vehicle\_costs.Row

> **Row**: `object`

###### Tables.vehicle\_costs.Row.amount

> **amount**: `number`

###### Tables.vehicle\_costs.Row.category

> **category**: `string`

###### Tables.vehicle\_costs.Row.company\_id

> **company\_id**: `string`

###### Tables.vehicle\_costs.Row.cost\_date

> **cost\_date**: `string`

###### Tables.vehicle\_costs.Row.created\_at

> **created\_at**: `string`

###### Tables.vehicle\_costs.Row.currency

> **currency**: `string`

###### Tables.vehicle\_costs.Row.description

> **description**: `string` \| `null`

###### Tables.vehicle\_costs.Row.id

> **id**: `string`

###### Tables.vehicle\_costs.Row.vehicle\_id

> **vehicle\_id**: `string`

###### Tables.vehicle\_costs.Update

> **Update**: `object`

###### Tables.vehicle\_costs.Update.amount?

> `optional` **amount?**: `number`

###### Tables.vehicle\_costs.Update.category?

> `optional` **category?**: `string`

###### Tables.vehicle\_costs.Update.company\_id?

> `optional` **company\_id?**: `string`

###### Tables.vehicle\_costs.Update.cost\_date?

> `optional` **cost\_date?**: `string`

###### Tables.vehicle\_costs.Update.created\_at?

> `optional` **created\_at?**: `string`

###### Tables.vehicle\_costs.Update.currency?

> `optional` **currency?**: `string`

###### Tables.vehicle\_costs.Update.description?

> `optional` **description?**: `string` \| `null`

###### Tables.vehicle\_costs.Update.id?

> `optional` **id?**: `string`

###### Tables.vehicle\_costs.Update.vehicle\_id?

> `optional` **vehicle\_id?**: `string`

###### Tables.vehicle\_defects

> **vehicle\_defects**: `object`

###### Tables.vehicle\_defects.Insert

> **Insert**: `object`

###### Tables.vehicle\_defects.Insert.company\_id

> **company\_id**: `string`

###### Tables.vehicle\_defects.Insert.created\_at?

> `optional` **created\_at?**: `string`

###### Tables.vehicle\_defects.Insert.dashboard\_light?

> `optional` **dashboard\_light?**: `boolean`

###### Tables.vehicle\_defects.Insert.description

> **description**: `string`

###### Tables.vehicle\_defects.Insert.id?

> `optional` **id?**: `string`

###### Tables.vehicle\_defects.Insert.part

> **part**: `string`

###### Tables.vehicle\_defects.Insert.reported\_by?

> `optional` **reported\_by?**: `string` \| `null`

###### Tables.vehicle\_defects.Insert.resolved\_at?

> `optional` **resolved\_at?**: `string` \| `null`

###### Tables.vehicle\_defects.Insert.resolved\_by?

> `optional` **resolved\_by?**: `string` \| `null`

###### Tables.vehicle\_defects.Insert.severity?

> `optional` **severity?**: `string`

###### Tables.vehicle\_defects.Insert.side?

> `optional` **side?**: `string` \| `null`

###### Tables.vehicle\_defects.Insert.status?

> `optional` **status?**: `string`

###### Tables.vehicle\_defects.Insert.updated\_at?

> `optional` **updated\_at?**: `string`

###### Tables.vehicle\_defects.Insert.vehicle\_id

> **vehicle\_id**: `string`

###### Tables.vehicle\_defects.Relationships

> **Relationships**: \[\]

###### Tables.vehicle\_defects.Row

> **Row**: `object`

###### Tables.vehicle\_defects.Row.company\_id

> **company\_id**: `string`

###### Tables.vehicle\_defects.Row.created\_at

> **created\_at**: `string`

###### Tables.vehicle\_defects.Row.dashboard\_light

> **dashboard\_light**: `boolean`

###### Tables.vehicle\_defects.Row.description

> **description**: `string`

###### Tables.vehicle\_defects.Row.id

> **id**: `string`

###### Tables.vehicle\_defects.Row.part

> **part**: `string`

###### Tables.vehicle\_defects.Row.reported\_by

> **reported\_by**: `string` \| `null`

###### Tables.vehicle\_defects.Row.resolved\_at

> **resolved\_at**: `string` \| `null`

###### Tables.vehicle\_defects.Row.resolved\_by

> **resolved\_by**: `string` \| `null`

###### Tables.vehicle\_defects.Row.severity

> **severity**: `string`

###### Tables.vehicle\_defects.Row.side

> **side**: `string` \| `null`

###### Tables.vehicle\_defects.Row.status

> **status**: `string`

###### Tables.vehicle\_defects.Row.updated\_at

> **updated\_at**: `string`

###### Tables.vehicle\_defects.Row.vehicle\_id

> **vehicle\_id**: `string`

###### Tables.vehicle\_defects.Update

> **Update**: `object`

###### Tables.vehicle\_defects.Update.company\_id?

> `optional` **company\_id?**: `string`

###### Tables.vehicle\_defects.Update.created\_at?

> `optional` **created\_at?**: `string`

###### Tables.vehicle\_defects.Update.dashboard\_light?

> `optional` **dashboard\_light?**: `boolean`

###### Tables.vehicle\_defects.Update.description?

> `optional` **description?**: `string`

###### Tables.vehicle\_defects.Update.id?

> `optional` **id?**: `string`

###### Tables.vehicle\_defects.Update.part?

> `optional` **part?**: `string`

###### Tables.vehicle\_defects.Update.reported\_by?

> `optional` **reported\_by?**: `string` \| `null`

###### Tables.vehicle\_defects.Update.resolved\_at?

> `optional` **resolved\_at?**: `string` \| `null`

###### Tables.vehicle\_defects.Update.resolved\_by?

> `optional` **resolved\_by?**: `string` \| `null`

###### Tables.vehicle\_defects.Update.severity?

> `optional` **severity?**: `string`

###### Tables.vehicle\_defects.Update.side?

> `optional` **side?**: `string` \| `null`

###### Tables.vehicle\_defects.Update.status?

> `optional` **status?**: `string`

###### Tables.vehicle\_defects.Update.updated\_at?

> `optional` **updated\_at?**: `string`

###### Tables.vehicle\_defects.Update.vehicle\_id?

> `optional` **vehicle\_id?**: `string`

###### Tables.vehicles

> **vehicles**: `object`

###### Tables.vehicles.Insert

> **Insert**: `object`

###### Tables.vehicles.Insert.adblue\_tank\_l?

> `optional` **adblue\_tank\_l?**: `number` \| `null`

###### Tables.vehicles.Insert.comment?

> `optional` **comment?**: `string` \| `null`

###### Tables.vehicles.Insert.company\_id

> **company\_id**: `string`

###### Tables.vehicles.Insert.created\_at?

> `optional` **created\_at?**: `string`

###### Tables.vehicles.Insert.curb\_weight\_kg?

> `optional` **curb\_weight\_kg?**: `number` \| `null`

###### Tables.vehicles.Insert.first\_registration\_date?

> `optional` **first\_registration\_date?**: `string` \| `null`

###### Tables.vehicles.Insert.forwarder?

> `optional` **forwarder?**: `string` \| `null`

###### Tables.vehicles.Insert.fuel\_tank\_l?

> `optional` **fuel\_tank\_l?**: `number` \| `null`

###### Tables.vehicles.Insert.height\_cm?

> `optional` **height\_cm?**: `number` \| `null`

###### Tables.vehicles.Insert.id?

> `optional` **id?**: `string`

###### Tables.vehicles.Insert.inspection\_expiry?

> `optional` **inspection\_expiry?**: `string` \| `null`

###### Tables.vehicles.Insert.insurance\_expiry?

> `optional` **insurance\_expiry?**: `string` \| `null`

###### Tables.vehicles.Insert.insurer?

> `optional` **insurer?**: `string` \| `null`

###### Tables.vehicles.Insert.leasing\_end?

> `optional` **leasing\_end?**: `string` \| `null`

###### Tables.vehicles.Insert.length\_cm?

> `optional` **length\_cm?**: `number` \| `null`

###### Tables.vehicles.Insert.license\_expiry?

> `optional` **license\_expiry?**: `string` \| `null`

###### Tables.vehicles.Insert.license\_number?

> `optional` **license\_number?**: `string` \| `null`

###### Tables.vehicles.Insert.make?

> `optional` **make?**: `string` \| `null`

###### Tables.vehicles.Insert.max\_payload\_kg?

> `optional` **max\_payload\_kg?**: `number` \| `null`

###### Tables.vehicles.Insert.model

> **model**: `string`

###### Tables.vehicles.Insert.registration

> **registration**: `string`

###### Tables.vehicles.Insert.trailer\_registration?

> `optional` **trailer\_registration?**: `string` \| `null`

###### Tables.vehicles.Insert.trailer\_type?

> `optional` **trailer\_type?**: `string` \| `null`

###### Tables.vehicles.Insert.updated\_at?

> `optional` **updated\_at?**: `string`

###### Tables.vehicles.Insert.vehicle\_type?

> `optional` **vehicle\_type?**: `"other"` \| `"truck"` \| `"tractor"` \| `"van"` \| `"trailer"`

###### Tables.vehicles.Insert.vin?

> `optional` **vin?**: `string` \| `null`

###### Tables.vehicles.Insert.width\_cm?

> `optional` **width\_cm?**: `number` \| `null`

###### Tables.vehicles.Insert.year?

> `optional` **year?**: `number` \| `null`

###### Tables.vehicles.Relationships

> **Relationships**: \[\]

###### Tables.vehicles.Row

> **Row**: `object`

###### Tables.vehicles.Row.adblue\_tank\_l

> **adblue\_tank\_l**: `number` \| `null`

###### Tables.vehicles.Row.comment

> **comment**: `string` \| `null`

###### Tables.vehicles.Row.company\_id

> **company\_id**: `string`

###### Tables.vehicles.Row.created\_at

> **created\_at**: `string`

###### Tables.vehicles.Row.curb\_weight\_kg

> **curb\_weight\_kg**: `number` \| `null`

###### Tables.vehicles.Row.first\_registration\_date

> **first\_registration\_date**: `string` \| `null`

###### Tables.vehicles.Row.forwarder

> **forwarder**: `string` \| `null`

###### Tables.vehicles.Row.fuel\_tank\_l

> **fuel\_tank\_l**: `number` \| `null`

###### Tables.vehicles.Row.height\_cm

> **height\_cm**: `number` \| `null`

###### Tables.vehicles.Row.id

> **id**: `string`

###### Tables.vehicles.Row.inspection\_expiry

> **inspection\_expiry**: `string` \| `null`

###### Tables.vehicles.Row.insurance\_expiry

> **insurance\_expiry**: `string` \| `null`

###### Tables.vehicles.Row.insurer

> **insurer**: `string` \| `null`

###### Tables.vehicles.Row.leasing\_end

> **leasing\_end**: `string` \| `null`

###### Tables.vehicles.Row.length\_cm

> **length\_cm**: `number` \| `null`

###### Tables.vehicles.Row.license\_expiry

> **license\_expiry**: `string` \| `null`

###### Tables.vehicles.Row.license\_number

> **license\_number**: `string` \| `null`

###### Tables.vehicles.Row.make

> **make**: `string` \| `null`

###### Tables.vehicles.Row.max\_payload\_kg

> **max\_payload\_kg**: `number` \| `null`

###### Tables.vehicles.Row.model

> **model**: `string`

###### Tables.vehicles.Row.registration

> **registration**: `string`

###### Tables.vehicles.Row.trailer\_registration

> **trailer\_registration**: `string` \| `null`

###### Tables.vehicles.Row.trailer\_type

> **trailer\_type**: `string` \| `null`

###### Tables.vehicles.Row.updated\_at

> **updated\_at**: `string`

###### Tables.vehicles.Row.vehicle\_type

> **vehicle\_type**: `"other"` \| `"truck"` \| `"tractor"` \| `"van"` \| `"trailer"`

###### Tables.vehicles.Row.vin

> **vin**: `string` \| `null`

###### Tables.vehicles.Row.width\_cm

> **width\_cm**: `number` \| `null`

###### Tables.vehicles.Row.year

> **year**: `number` \| `null`

###### Tables.vehicles.Update

> **Update**: `object`

###### Tables.vehicles.Update.adblue\_tank\_l?

> `optional` **adblue\_tank\_l?**: `number` \| `null`

###### Tables.vehicles.Update.comment?

> `optional` **comment?**: `string` \| `null`

###### Tables.vehicles.Update.company\_id?

> `optional` **company\_id?**: `string`

###### Tables.vehicles.Update.created\_at?

> `optional` **created\_at?**: `string`

###### Tables.vehicles.Update.curb\_weight\_kg?

> `optional` **curb\_weight\_kg?**: `number` \| `null`

###### Tables.vehicles.Update.first\_registration\_date?

> `optional` **first\_registration\_date?**: `string` \| `null`

###### Tables.vehicles.Update.forwarder?

> `optional` **forwarder?**: `string` \| `null`

###### Tables.vehicles.Update.fuel\_tank\_l?

> `optional` **fuel\_tank\_l?**: `number` \| `null`

###### Tables.vehicles.Update.height\_cm?

> `optional` **height\_cm?**: `number` \| `null`

###### Tables.vehicles.Update.id?

> `optional` **id?**: `string`

###### Tables.vehicles.Update.inspection\_expiry?

> `optional` **inspection\_expiry?**: `string` \| `null`

###### Tables.vehicles.Update.insurance\_expiry?

> `optional` **insurance\_expiry?**: `string` \| `null`

###### Tables.vehicles.Update.insurer?

> `optional` **insurer?**: `string` \| `null`

###### Tables.vehicles.Update.leasing\_end?

> `optional` **leasing\_end?**: `string` \| `null`

###### Tables.vehicles.Update.length\_cm?

> `optional` **length\_cm?**: `number` \| `null`

###### Tables.vehicles.Update.license\_expiry?

> `optional` **license\_expiry?**: `string` \| `null`

###### Tables.vehicles.Update.license\_number?

> `optional` **license\_number?**: `string` \| `null`

###### Tables.vehicles.Update.make?

> `optional` **make?**: `string` \| `null`

###### Tables.vehicles.Update.max\_payload\_kg?

> `optional` **max\_payload\_kg?**: `number` \| `null`

###### Tables.vehicles.Update.model?

> `optional` **model?**: `string`

###### Tables.vehicles.Update.registration?

> `optional` **registration?**: `string`

###### Tables.vehicles.Update.trailer\_registration?

> `optional` **trailer\_registration?**: `string` \| `null`

###### Tables.vehicles.Update.trailer\_type?

> `optional` **trailer\_type?**: `string` \| `null`

###### Tables.vehicles.Update.updated\_at?

> `optional` **updated\_at?**: `string`

###### Tables.vehicles.Update.vehicle\_type?

> `optional` **vehicle\_type?**: `"other"` \| `"truck"` \| `"tractor"` \| `"van"` \| `"trailer"`

###### Tables.vehicles.Update.vin?

> `optional` **vin?**: `string` \| `null`

###### Tables.vehicles.Update.width\_cm?

> `optional` **width\_cm?**: `number` \| `null`

###### Tables.vehicles.Update.year?

> `optional` **year?**: `number` \| `null`

###### Tables.work\_time\_entries

> **work\_time\_entries**: `object`

###### Tables.work\_time\_entries.Insert

> **Insert**: `object`

###### Tables.work\_time\_entries.Insert.company\_id

> **company\_id**: `string`

###### Tables.work\_time\_entries.Insert.created\_at?

> `optional` **created\_at?**: `string`

###### Tables.work\_time\_entries.Insert.created\_by?

> `optional` **created\_by?**: `string` \| `null`

###### Tables.work\_time\_entries.Insert.driver\_id?

> `optional` **driver\_id?**: `string` \| `null`

###### Tables.work\_time\_entries.Insert.driver\_name?

> `optional` **driver\_name?**: `string` \| `null`

###### Tables.work\_time\_entries.Insert.driving?

> `optional` **driving?**: `number`

###### Tables.work\_time\_entries.Insert.id?

> `optional` **id?**: `string`

###### Tables.work\_time\_entries.Insert.note?

> `optional` **note?**: `string` \| `null`

###### Tables.work\_time\_entries.Insert.other\_work?

> `optional` **other\_work?**: `number`

###### Tables.work\_time\_entries.Insert.rest?

> `optional` **rest?**: `number`

###### Tables.work\_time\_entries.Insert.work\_date

> **work\_date**: `string`

###### Tables.work\_time\_entries.Relationships

> **Relationships**: \[\]

###### Tables.work\_time\_entries.Row

> **Row**: `object`

###### Tables.work\_time\_entries.Row.company\_id

> **company\_id**: `string`

###### Tables.work\_time\_entries.Row.created\_at

> **created\_at**: `string`

###### Tables.work\_time\_entries.Row.created\_by

> **created\_by**: `string` \| `null`

###### Tables.work\_time\_entries.Row.driver\_id

> **driver\_id**: `string` \| `null`

###### Tables.work\_time\_entries.Row.driver\_name

> **driver\_name**: `string` \| `null`

###### Tables.work\_time\_entries.Row.driving

> **driving**: `number`

###### Tables.work\_time\_entries.Row.id

> **id**: `string`

###### Tables.work\_time\_entries.Row.note

> **note**: `string` \| `null`

###### Tables.work\_time\_entries.Row.other\_work

> **other\_work**: `number`

###### Tables.work\_time\_entries.Row.rest

> **rest**: `number`

###### Tables.work\_time\_entries.Row.work\_date

> **work\_date**: `string`

###### Tables.work\_time\_entries.Update

> **Update**: `object`

###### Tables.work\_time\_entries.Update.company\_id?

> `optional` **company\_id?**: `string`

###### Tables.work\_time\_entries.Update.created\_at?

> `optional` **created\_at?**: `string`

###### Tables.work\_time\_entries.Update.created\_by?

> `optional` **created\_by?**: `string` \| `null`

###### Tables.work\_time\_entries.Update.driver\_id?

> `optional` **driver\_id?**: `string` \| `null`

###### Tables.work\_time\_entries.Update.driver\_name?

> `optional` **driver\_name?**: `string` \| `null`

###### Tables.work\_time\_entries.Update.driving?

> `optional` **driving?**: `number`

###### Tables.work\_time\_entries.Update.id?

> `optional` **id?**: `string`

###### Tables.work\_time\_entries.Update.note?

> `optional` **note?**: `string` \| `null`

###### Tables.work\_time\_entries.Update.other\_work?

> `optional` **other\_work?**: `number`

###### Tables.work\_time\_entries.Update.rest?

> `optional` **rest?**: `number`

###### Tables.work\_time\_entries.Update.work\_date?

> `optional` **work\_date?**: `string`

###### Views

> **Views**: `object`

***

### DocumentMeta

Defined in: [api/src/data/documents.ts:7](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/documents.ts#L7)

#### Properties

##### allowed\_user\_ids

> **allowed\_user\_ids**: `string`[]

Defined in: [api/src/data/documents.ts:20](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/documents.ts#L20)

##### category

> **category**: `string` \| `null`

Defined in: [api/src/data/documents.ts:14](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/documents.ts#L14)

##### created\_at

> **created\_at**: `string`

Defined in: [api/src/data/documents.ts:17](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/documents.ts#L17)

##### expiry\_date

> **expiry\_date**: `string` \| `null`

Defined in: [api/src/data/documents.ts:15](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/documents.ts#L15)

##### id

> **id**: `string`

Defined in: [api/src/data/documents.ts:8](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/documents.ts#L8)

##### mime

> **mime**: `string` \| `null`

Defined in: [api/src/data/documents.ts:13](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/documents.ts#L13)

##### name

> **name**: `string`

Defined in: [api/src/data/documents.ts:10](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/documents.ts#L10)

##### path

> **path**: `string`

Defined in: [api/src/data/documents.ts:11](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/documents.ts#L11)

##### size\_bytes

> **size\_bytes**: `number` \| `null`

Defined in: [api/src/data/documents.ts:12](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/documents.ts#L12)

##### uploaded\_by

> **uploaded\_by**: `string` \| `null`

Defined in: [api/src/data/documents.ts:16](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/documents.ts#L16)

##### vehicle\_id

> **vehicle\_id**: `string` \| `null`

Defined in: [api/src/data/documents.ts:9](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/documents.ts#L9)

##### visibility

> **visibility**: `"company"` \| `"management"` \| `"selected"`

Defined in: [api/src/data/documents.ts:19](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/documents.ts#L19)

#275: kto widzi — 'management' (zarząd), 'company' (wszyscy), 'selected'.

***

### DriverExpense

Defined in: [api/src/data/driverExpenses.ts:20](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/driverExpenses.ts#L20)

#### Properties

##### amount

> **amount**: `number`

Defined in: [api/src/data/driverExpenses.ts:26](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/driverExpenses.ts#L26)

##### category

> **category**: `"other"` \| `"parking"` \| `"wash"` \| `"repair"` \| `"toll"`

Defined in: [api/src/data/driverExpenses.ts:25](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/driverExpenses.ts#L25)

##### company\_id

> **company\_id**: `string`

Defined in: [api/src/data/driverExpenses.ts:22](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/driverExpenses.ts#L22)

##### created\_at

> **created\_at**: `string`

Defined in: [api/src/data/driverExpenses.ts:32](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/driverExpenses.ts#L32)

##### currency

> **currency**: `string`

Defined in: [api/src/data/driverExpenses.ts:27](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/driverExpenses.ts#L27)

##### expense\_date

> **expense\_date**: `string`

Defined in: [api/src/data/driverExpenses.ts:28](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/driverExpenses.ts#L28)

##### id

> **id**: `string`

Defined in: [api/src/data/driverExpenses.ts:21](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/driverExpenses.ts#L21)

##### note

> **note**: `string` \| `null`

Defined in: [api/src/data/driverExpenses.ts:29](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/driverExpenses.ts#L29)

##### photo\_path

> **photo\_path**: `string` \| `null`

Defined in: [api/src/data/driverExpenses.ts:30](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/driverExpenses.ts#L30)

##### status

> **status**: [`ExpenseStatus`](../api/api/src.md#expensestatus)

Defined in: [api/src/data/driverExpenses.ts:31](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/driverExpenses.ts#L31)

##### user\_id

> **user\_id**: `string`

Defined in: [api/src/data/driverExpenses.ts:23](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/driverExpenses.ts#L23)

##### vehicle\_id

> **vehicle\_id**: `string` \| `null`

Defined in: [api/src/data/driverExpenses.ts:24](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/driverExpenses.ts#L24)

***

### DriverExpenseInput

Defined in: [api/src/data/driverExpenses.ts:35](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/driverExpenses.ts#L35)

#### Properties

##### amount

> **amount**: `number`

Defined in: [api/src/data/driverExpenses.ts:39](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/driverExpenses.ts#L39)

##### category

> **category**: `"other"` \| `"parking"` \| `"wash"` \| `"repair"` \| `"toll"`

Defined in: [api/src/data/driverExpenses.ts:38](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/driverExpenses.ts#L38)

##### companyId

> **companyId**: `string`

Defined in: [api/src/data/driverExpenses.ts:36](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/driverExpenses.ts#L36)

##### currency?

> `optional` **currency?**: `string`

Defined in: [api/src/data/driverExpenses.ts:40](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/driverExpenses.ts#L40)

##### expenseDate?

> `optional` **expenseDate?**: `string`

Defined in: [api/src/data/driverExpenses.ts:41](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/driverExpenses.ts#L41)

##### note?

> `optional` **note?**: `string` \| `null`

Defined in: [api/src/data/driverExpenses.ts:42](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/driverExpenses.ts#L42)

##### photoPath?

> `optional` **photoPath?**: `string` \| `null`

Defined in: [api/src/data/driverExpenses.ts:43](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/driverExpenses.ts#L43)

##### vehicleId?

> `optional` **vehicleId?**: `string` \| `null`

Defined in: [api/src/data/driverExpenses.ts:37](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/driverExpenses.ts#L37)

***

### DriverPayoutInput

Defined in: [api/src/data/driverPayouts.ts:16](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/driverPayouts.ts#L16)

#### Properties

##### amount

> **amount**: `number`

Defined in: [api/src/data/driverPayouts.ts:21](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/driverPayouts.ts#L21)

##### currency

> **currency**: `string`

Defined in: [api/src/data/driverPayouts.ts:22](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/driverPayouts.ts#L22)

##### driverId?

> `optional` **driverId?**: `string` \| `null`

Defined in: [api/src/data/driverPayouts.ts:19](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/driverPayouts.ts#L19)

#271: FK do kartoteki — spójna tożsamość kierowcy obok nazwy.

##### driverName?

> `optional` **driverName?**: `string` \| `null`

Defined in: [api/src/data/driverPayouts.ts:17](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/driverPayouts.ts#L17)

##### entryDate

> **entryDate**: `string`

Defined in: [api/src/data/driverPayouts.ts:23](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/driverPayouts.ts#L23)

##### kind

> **kind**: `"due"` \| `"advance"` \| `"deduction"` \| `"payout"`

Defined in: [api/src/data/driverPayouts.ts:20](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/driverPayouts.ts#L20)

##### note?

> `optional` **note?**: `string` \| `null`

Defined in: [api/src/data/driverPayouts.ts:24](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/driverPayouts.ts#L24)

***

### DriverPayoutRecord

Defined in: [api/src/data/driverPayouts.ts:5](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/driverPayouts.ts#L5)

#### Properties

##### amount

> **amount**: `number`

Defined in: [api/src/data/driverPayouts.ts:9](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/driverPayouts.ts#L9)

##### created\_at

> **created\_at**: `string`

Defined in: [api/src/data/driverPayouts.ts:13](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/driverPayouts.ts#L13)

##### currency

> **currency**: `string`

Defined in: [api/src/data/driverPayouts.ts:10](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/driverPayouts.ts#L10)

##### driver\_name

> **driver\_name**: `string` \| `null`

Defined in: [api/src/data/driverPayouts.ts:7](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/driverPayouts.ts#L7)

##### entry\_date

> **entry\_date**: `string`

Defined in: [api/src/data/driverPayouts.ts:11](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/driverPayouts.ts#L11)

##### id

> **id**: `string`

Defined in: [api/src/data/driverPayouts.ts:6](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/driverPayouts.ts#L6)

##### kind

> **kind**: `"due"` \| `"advance"` \| `"deduction"` \| `"payout"`

Defined in: [api/src/data/driverPayouts.ts:8](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/driverPayouts.ts#L8)

##### note

> **note**: `string` \| `null`

Defined in: [api/src/data/driverPayouts.ts:12](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/driverPayouts.ts#L12)

***

### DriverPosition

Defined in: [api/src/data/positions.ts:8](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/positions.ts#L8)

#### Properties

##### company\_id

> **company\_id**: `string`

Defined in: [api/src/data/positions.ts:10](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/positions.ts#L10)

##### heading

> **heading**: `number` \| `null`

Defined in: [api/src/data/positions.ts:14](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/positions.ts#L14)

##### lat

> **lat**: `number`

Defined in: [api/src/data/positions.ts:11](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/positions.ts#L11)

##### lng

> **lng**: `number`

Defined in: [api/src/data/positions.ts:12](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/positions.ts#L12)

##### speed\_kmh

> **speed\_kmh**: `number` \| `null`

Defined in: [api/src/data/positions.ts:13](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/positions.ts#L13)

##### updated\_at

> **updated\_at**: `string`

Defined in: [api/src/data/positions.ts:15](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/positions.ts#L15)

##### user\_id

> **user\_id**: `string`

Defined in: [api/src/data/positions.ts:9](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/positions.ts#L9)

***

### DriverRoute

Defined in: [api/src/data/driverRoutes.ts:17](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/driverRoutes.ts#L17)

#### Properties

##### created\_at

> **created\_at**: `string`

Defined in: [api/src/data/driverRoutes.ts:24](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/driverRoutes.ts#L24)

##### geometry

> **geometry**: \[`number`, `number`\][]

Defined in: [api/src/data/driverRoutes.ts:22](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/driverRoutes.ts#L22)

Linia trasy policzona na web: [[lng,lat], …].

##### id

> **id**: `string`

Defined in: [api/src/data/driverRoutes.ts:18](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/driverRoutes.ts#L18)

##### name

> **name**: `string`

Defined in: [api/src/data/driverRoutes.ts:19](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/driverRoutes.ts#L19)

##### stops

> **stops**: [`RouteStopPoint`](../api/api/src.md#routestoppoint)[]

Defined in: [api/src/data/driverRoutes.ts:20](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/driverRoutes.ts#L20)

##### summary

> **summary**: [`DriverRouteSummary`](../api/api/src.md#driverroutesummary-1)

Defined in: [api/src/data/driverRoutes.ts:23](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/driverRoutes.ts#L23)

***

### DriverRouteSummary

Defined in: [api/src/data/driverRoutes.ts:10](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/driverRoutes.ts#L10)

#### Properties

##### currency?

> `optional` **currency?**: `string`

Defined in: [api/src/data/driverRoutes.ts:14](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/driverRoutes.ts#L14)

##### distanceKm?

> `optional` **distanceKm?**: `number`

Defined in: [api/src/data/driverRoutes.ts:11](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/driverRoutes.ts#L11)

##### durationMin?

> `optional` **durationMin?**: `number`

Defined in: [api/src/data/driverRoutes.ts:12](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/driverRoutes.ts#L12)

##### tollCost?

> `optional` **tollCost?**: `number`

Defined in: [api/src/data/driverRoutes.ts:13](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/driverRoutes.ts#L13)

***

### DriverRow

Defined in: [api/src/data/drivers.ts:7](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/drivers.ts#L7)

Wiersz kartoteki (tożsamość deszyfrowana po stronie bazy).

#### Properties

##### adr\_expiry

> **adr\_expiry**: `string` \| `null`

Defined in: [api/src/data/drivers.ts:19](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/drivers.ts#L19)

##### birth\_date

> **birth\_date**: `string` \| `null`

Defined in: [api/src/data/drivers.ts:11](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/drivers.ts#L11)

##### code95\_expiry

> **code95\_expiry**: `string` \| `null`

Defined in: [api/src/data/drivers.ts:16](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/drivers.ts#L16)

##### first\_name

> **first\_name**: `string`

Defined in: [api/src/data/drivers.ts:9](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/drivers.ts#L9)

##### id

> **id**: `string`

Defined in: [api/src/data/drivers.ts:8](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/drivers.ts#L8)

##### id\_card\_expiry

> **id\_card\_expiry**: `string` \| `null`

Defined in: [api/src/data/drivers.ts:21](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/drivers.ts#L21)

##### last\_name

> **last\_name**: `string`

Defined in: [api/src/data/drivers.ts:10](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/drivers.ts#L10)

##### license\_categories

> **license\_categories**: `string`[]

Defined in: [api/src/data/drivers.ts:12](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/drivers.ts#L12)

##### license\_expiry

> **license\_expiry**: `string` \| `null`

Defined in: [api/src/data/drivers.ts:15](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/drivers.ts#L15)

##### medical\_expiry

> **medical\_expiry**: `string` \| `null`

Defined in: [api/src/data/drivers.ts:17](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/drivers.ts#L17)

##### notes

> **notes**: `string` \| `null`

Defined in: [api/src/data/drivers.ts:14](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/drivers.ts#L14)

##### passport\_expiry

> **passport\_expiry**: `string` \| `null`

Defined in: [api/src/data/drivers.ts:20](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/drivers.ts#L20)

##### psychotech\_expiry

> **psychotech\_expiry**: `string` \| `null`

Defined in: [api/src/data/drivers.ts:18](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/drivers.ts#L18)

##### qualification\_details

> **qualification\_details**: `object`[]

Defined in: [api/src/data/drivers.ts:22](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/drivers.ts#L22)

###### doc\_number?

> `optional` **doc\_number?**: `string` \| `null`

###### expiry?

> `optional` **expiry?**: `string` \| `null`

###### name

> **name**: `string`

##### qualifications

> **qualifications**: `string`[]

Defined in: [api/src/data/drivers.ts:13](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/drivers.ts#L13)

##### user\_id

> **user\_id**: `string` \| `null`

Defined in: [api/src/data/drivers.ts:23](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/drivers.ts#L23)

***

### ExpoPushTokenInput

Defined in: [api/src/data/expoPush.ts:4](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/expoPush.ts#L4)

#### Properties

##### companyId?

> `optional` **companyId?**: `string` \| `null`

Defined in: [api/src/data/expoPush.ts:7](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/expoPush.ts#L7)

##### platform?

> `optional` **platform?**: `string` \| `null`

Defined in: [api/src/data/expoPush.ts:6](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/expoPush.ts#L6)

##### token

> **token**: `string`

Defined in: [api/src/data/expoPush.ts:5](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/expoPush.ts#L5)

***

### FuelLogContext

Defined in: [api/src/data/fuelLogs.ts:5](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/fuelLogs.ts#L5)

#### Properties

##### companyId

> **companyId**: `string`

Defined in: [api/src/data/fuelLogs.ts:8](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/fuelLogs.ts#L8)

##### deviceId?

> `optional` **deviceId?**: `string`

Defined in: [api/src/data/fuelLogs.ts:10](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/fuelLogs.ts#L10)

##### driverId

> **driverId**: `string`

Defined in: [api/src/data/fuelLogs.ts:9](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/fuelLogs.ts#L9)

##### id

> **id**: `string`

Defined in: [api/src/data/fuelLogs.ts:7](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/fuelLogs.ts#L7)

UUID rekordu wygenerowany na kliencie (offline-first).

***

### Invoice

Defined in: [api/src/data/invoices.ts:5](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/invoices.ts#L5)

#### Properties

##### buyer\_address

> **buyer\_address**: `string` \| `null`

Defined in: [api/src/data/invoices.ts:17](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/invoices.ts#L17)

##### buyer\_name

> **buyer\_name**: `string` \| `null`

Defined in: [api/src/data/invoices.ts:15](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/invoices.ts#L15)

##### buyer\_tax\_id

> **buyer\_tax\_id**: `string` \| `null`

Defined in: [api/src/data/invoices.ts:16](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/invoices.ts#L16)

##### created\_at

> **created\_at**: `string`

Defined in: [api/src/data/invoices.ts:27](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/invoices.ts#L27)

##### currency

> **currency**: `string`

Defined in: [api/src/data/invoices.ts:23](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/invoices.ts#L23)

##### description

> **description**: `string` \| `null`

Defined in: [api/src/data/invoices.ts:18](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/invoices.ts#L18)

##### due\_date

> **due\_date**: `string` \| `null`

Defined in: [api/src/data/invoices.ts:25](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/invoices.ts#L25)

##### gross

> **gross**: `number`

Defined in: [api/src/data/invoices.ts:22](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/invoices.ts#L22)

##### id

> **id**: `string`

Defined in: [api/src/data/invoices.ts:6](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/invoices.ts#L6)

##### issue\_date

> **issue\_date**: `string`

Defined in: [api/src/data/invoices.ts:9](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/invoices.ts#L9)

##### net

> **net**: `number`

Defined in: [api/src/data/invoices.ts:19](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/invoices.ts#L19)

##### number

> **number**: `string`

Defined in: [api/src/data/invoices.ts:8](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/invoices.ts#L8)

##### order\_id

> **order\_id**: `string` \| `null`

Defined in: [api/src/data/invoices.ts:7](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/invoices.ts#L7)

##### paid\_at

> **paid\_at**: `string` \| `null`

Defined in: [api/src/data/invoices.ts:26](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/invoices.ts#L26)

##### seller\_account

> **seller\_account**: `string` \| `null`

Defined in: [api/src/data/invoices.ts:14](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/invoices.ts#L14)

##### seller\_address

> **seller\_address**: `string` \| `null`

Defined in: [api/src/data/invoices.ts:12](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/invoices.ts#L12)

##### seller\_bank

> **seller\_bank**: `string` \| `null`

Defined in: [api/src/data/invoices.ts:13](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/invoices.ts#L13)

##### seller\_name

> **seller\_name**: `string` \| `null`

Defined in: [api/src/data/invoices.ts:10](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/invoices.ts#L10)

##### seller\_tax\_id

> **seller\_tax\_id**: `string` \| `null`

Defined in: [api/src/data/invoices.ts:11](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/invoices.ts#L11)

##### status

> **status**: `string`

Defined in: [api/src/data/invoices.ts:24](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/invoices.ts#L24)

##### vat\_amount

> **vat\_amount**: `number`

Defined in: [api/src/data/invoices.ts:21](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/invoices.ts#L21)

##### vat\_rate

> **vat\_rate**: `number`

Defined in: [api/src/data/invoices.ts:20](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/invoices.ts#L20)

***

### InvoiceItem

Defined in: [api/src/data/invoices.ts:126](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/invoices.ts#L126)

#### Properties

##### description

> **description**: `string`

Defined in: [api/src/data/invoices.ts:130](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/invoices.ts#L130)

##### gross

> **gross**: `number`

Defined in: [api/src/data/invoices.ts:136](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/invoices.ts#L136)

##### id

> **id**: `string`

Defined in: [api/src/data/invoices.ts:127](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/invoices.ts#L127)

##### invoice\_id

> **invoice\_id**: `string`

Defined in: [api/src/data/invoices.ts:128](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/invoices.ts#L128)

##### net

> **net**: `number`

Defined in: [api/src/data/invoices.ts:134](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/invoices.ts#L134)

##### position

> **position**: `number`

Defined in: [api/src/data/invoices.ts:129](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/invoices.ts#L129)

##### quantity

> **quantity**: `number`

Defined in: [api/src/data/invoices.ts:131](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/invoices.ts#L131)

##### unit\_price

> **unit\_price**: `number`

Defined in: [api/src/data/invoices.ts:132](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/invoices.ts#L132)

##### vat\_amount

> **vat\_amount**: `number`

Defined in: [api/src/data/invoices.ts:135](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/invoices.ts#L135)

##### vat\_rate

> **vat\_rate**: `number`

Defined in: [api/src/data/invoices.ts:133](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/invoices.ts#L133)

***

### InvoiceItemInput

Defined in: [api/src/data/invoices.ts:156](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/invoices.ts#L156)

#### Properties

##### description

> **description**: `string`

Defined in: [api/src/data/invoices.ts:157](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/invoices.ts#L157)

##### position?

> `optional` **position?**: `number`

Defined in: [api/src/data/invoices.ts:161](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/invoices.ts#L161)

##### quantity

> **quantity**: `number`

Defined in: [api/src/data/invoices.ts:158](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/invoices.ts#L158)

##### unitPrice

> **unitPrice**: `number`

Defined in: [api/src/data/invoices.ts:159](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/invoices.ts#L159)

##### vatRate?

> `optional` **vatRate?**: `number`

Defined in: [api/src/data/invoices.ts:160](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/invoices.ts#L160)

***

### MobileAuthStorage

Defined in: [api/src/client.ts:41](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/client.ts#L41)

Adapter pamięci dla sesji mobilnej (np. AsyncStorage z React Native).

#### Methods

##### getItem()

> **getItem**(`key`): `string` \| `Promise`\<`string` \| `null`\> \| `null`

Defined in: [api/src/client.ts:42](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/client.ts#L42)

###### Parameters

###### key

`string`

###### Returns

`string` \| `Promise`\<`string` \| `null`\> \| `null`

##### removeItem()

> **removeItem**(`key`): `void` \| `Promise`\<`void`\>

Defined in: [api/src/client.ts:44](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/client.ts#L44)

###### Parameters

###### key

`string`

###### Returns

`void` \| `Promise`\<`void`\>

##### setItem()

> **setItem**(`key`, `value`): `void` \| `Promise`\<`void`\>

Defined in: [api/src/client.ts:43](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/client.ts#L43)

###### Parameters

###### key

`string`

###### value

`string`

###### Returns

`void` \| `Promise`\<`void`\>

***

### Order

Defined in: [api/src/data/orders.ts:5](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/orders.ts#L5)

#### Properties

##### assigned\_to

> **assigned\_to**: `string` \| `null`

Defined in: [api/src/data/orders.ts:18](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/orders.ts#L18)

##### cargo

> **cargo**: `string` \| `null`

Defined in: [api/src/data/orders.ts:12](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/orders.ts#L12)

##### consignee

> **consignee**: `string` \| `null`

Defined in: [api/src/data/orders.ts:9](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/orders.ts#L9)

##### created\_at

> **created\_at**: `string`

Defined in: [api/src/data/orders.ts:22](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/orders.ts#L22)

##### currency

> **currency**: `string`

Defined in: [api/src/data/orders.ts:15](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/orders.ts#L15)

##### destination

> **destination**: `string` \| `null`

Defined in: [api/src/data/orders.ts:11](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/orders.ts#L11)

##### id

> **id**: `string`

Defined in: [api/src/data/orders.ts:6](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/orders.ts#L6)

##### load\_date

> **load\_date**: `string` \| `null`

Defined in: [api/src/data/orders.ts:19](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/orders.ts#L19)

##### notes

> **notes**: `string` \| `null`

Defined in: [api/src/data/orders.ts:21](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/orders.ts#L21)

##### origin

> **origin**: `string` \| `null`

Defined in: [api/src/data/orders.ts:10](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/orders.ts#L10)

##### price

> **price**: `number` \| `null`

Defined in: [api/src/data/orders.ts:14](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/orders.ts#L14)

##### reference\_no

> **reference\_no**: `string` \| `null`

Defined in: [api/src/data/orders.ts:7](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/orders.ts#L7)

##### shipper

> **shipper**: `string` \| `null`

Defined in: [api/src/data/orders.ts:8](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/orders.ts#L8)

##### status

> **status**: `"new"` \| `"assigned"` \| `"in_progress"` \| `"delivered"` \| `"invoiced"` \| `"cancelled"`

Defined in: [api/src/data/orders.ts:16](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/orders.ts#L16)

##### unload\_date

> **unload\_date**: `string` \| `null`

Defined in: [api/src/data/orders.ts:20](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/orders.ts#L20)

##### vehicle\_id

> **vehicle\_id**: `string` \| `null`

Defined in: [api/src/data/orders.ts:17](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/orders.ts#L17)

##### weight\_kg

> **weight\_kg**: `number` \| `null`

Defined in: [api/src/data/orders.ts:13](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/orders.ts#L13)

***

### OrderPhoto

Defined in: [api/src/data/orderPhotos.ts:7](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/orderPhotos.ts#L7)

#### Properties

##### caption

> **caption**: `string` \| `null`

Defined in: [api/src/data/orderPhotos.ts:13](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/orderPhotos.ts#L13)

##### created\_at

> **created\_at**: `string`

Defined in: [api/src/data/orderPhotos.ts:15](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/orderPhotos.ts#L15)

##### id

> **id**: `string`

Defined in: [api/src/data/orderPhotos.ts:8](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/orderPhotos.ts#L8)

##### kind?

> `optional` **kind?**: `string` \| `null`

Defined in: [api/src/data/orderPhotos.ts:17](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/orderPhotos.ts#L17)

Typ załącznika (#249, migracja 0054 — kolumna generowana z `caption`).

##### mime

> **mime**: `string` \| `null`

Defined in: [api/src/data/orderPhotos.ts:11](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/orderPhotos.ts#L11)

##### order\_id

> **order\_id**: `string`

Defined in: [api/src/data/orderPhotos.ts:9](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/orderPhotos.ts#L9)

##### path

> **path**: `string`

Defined in: [api/src/data/orderPhotos.ts:10](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/orderPhotos.ts#L10)

##### size\_bytes

> **size\_bytes**: `number` \| `null`

Defined in: [api/src/data/orderPhotos.ts:12](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/orderPhotos.ts#L12)

##### uploaded\_by

> **uploaded\_by**: `string` \| `null`

Defined in: [api/src/data/orderPhotos.ts:14](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/orderPhotos.ts#L14)

***

### OrderTracking

Defined in: [api/src/data/orderTracking.ts:9](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/orderTracking.ts#L9)

#### Properties

##### destination

> **destination**: `string` \| `null`

Defined in: [api/src/data/orderTracking.ts:12](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/orderTracking.ts#L12)

##### load\_date

> **load\_date**: `string` \| `null`

Defined in: [api/src/data/orderTracking.ts:14](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/orderTracking.ts#L14)

##### origin

> **origin**: `string` \| `null`

Defined in: [api/src/data/orderTracking.ts:11](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/orderTracking.ts#L11)

##### reference\_no

> **reference\_no**: `string` \| `null`

Defined in: [api/src/data/orderTracking.ts:10](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/orderTracking.ts#L10)

##### status

> **status**: `"new"` \| `"assigned"` \| `"in_progress"` \| `"delivered"` \| `"invoiced"` \| `"cancelled"`

Defined in: [api/src/data/orderTracking.ts:13](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/orderTracking.ts#L13)

##### truck\_lat

> **truck\_lat**: `number` \| `null`

Defined in: [api/src/data/orderTracking.ts:18](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/orderTracking.ts#L18)

#325: pozycja auta (~1 km, tylko assigned/in_progress i świeższa niż 12 h).

##### truck\_lng

> **truck\_lng**: `number` \| `null`

Defined in: [api/src/data/orderTracking.ts:19](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/orderTracking.ts#L19)

##### truck\_updated\_at

> **truck\_updated\_at**: `string` \| `null`

Defined in: [api/src/data/orderTracking.ts:20](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/orderTracking.ts#L20)

##### unload\_date

> **unload\_date**: `string` \| `null`

Defined in: [api/src/data/orderTracking.ts:15](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/orderTracking.ts#L15)

##### updated\_at

> **updated\_at**: `string`

Defined in: [api/src/data/orderTracking.ts:16](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/orderTracking.ts#L16)

***

### ParkingReview

Defined in: [api/src/data/parkingReviews.ts:10](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/parkingReviews.ts#L10)

#### Properties

##### created\_at

> **created\_at**: `string`

Defined in: [api/src/data/parkingReviews.ts:21](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/parkingReviews.ts#L21)

##### has\_food

> **has\_food**: `boolean`

Defined in: [api/src/data/parkingReviews.ts:18](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/parkingReviews.ts#L18)

##### has\_shower

> **has\_shower**: `boolean`

Defined in: [api/src/data/parkingReviews.ts:16](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/parkingReviews.ts#L16)

##### has\_wc

> **has\_wc**: `boolean`

Defined in: [api/src/data/parkingReviews.ts:17](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/parkingReviews.ts#L17)

##### id

> **id**: `string`

Defined in: [api/src/data/parkingReviews.ts:11](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/parkingReviews.ts#L11)

##### note

> **note**: `string` \| `null`

Defined in: [api/src/data/parkingReviews.ts:20](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/parkingReviews.ts#L20)

##### poi\_id

> **poi\_id**: `string`

Defined in: [api/src/data/parkingReviews.ts:13](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/parkingReviews.ts#L13)

##### poi\_name

> **poi\_name**: `string` \| `null`

Defined in: [api/src/data/parkingReviews.ts:14](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/parkingReviews.ts#L14)

##### rating

> **rating**: `number`

Defined in: [api/src/data/parkingReviews.ts:15](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/parkingReviews.ts#L15)

##### security

> **security**: `boolean`

Defined in: [api/src/data/parkingReviews.ts:19](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/parkingReviews.ts#L19)

##### user\_id

> **user\_id**: `string`

Defined in: [api/src/data/parkingReviews.ts:12](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/parkingReviews.ts#L12)

***

### ParkingReviewInput

Defined in: [api/src/data/parkingReviews.ts:24](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/parkingReviews.ts#L24)

#### Properties

##### hasFood?

> `optional` **hasFood?**: `boolean`

Defined in: [api/src/data/parkingReviews.ts:32](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/parkingReviews.ts#L32)

##### hasShower?

> `optional` **hasShower?**: `boolean`

Defined in: [api/src/data/parkingReviews.ts:30](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/parkingReviews.ts#L30)

##### hasWc?

> `optional` **hasWc?**: `boolean`

Defined in: [api/src/data/parkingReviews.ts:31](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/parkingReviews.ts#L31)

##### lat?

> `optional` **lat?**: `number`

Defined in: [api/src/data/parkingReviews.ts:27](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/parkingReviews.ts#L27)

##### lng?

> `optional` **lng?**: `number`

Defined in: [api/src/data/parkingReviews.ts:28](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/parkingReviews.ts#L28)

##### note?

> `optional` **note?**: `string` \| `null`

Defined in: [api/src/data/parkingReviews.ts:34](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/parkingReviews.ts#L34)

##### poiId

> **poiId**: `string`

Defined in: [api/src/data/parkingReviews.ts:25](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/parkingReviews.ts#L25)

##### poiName?

> `optional` **poiName?**: `string` \| `null`

Defined in: [api/src/data/parkingReviews.ts:26](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/parkingReviews.ts#L26)

##### rating

> **rating**: `number`

Defined in: [api/src/data/parkingReviews.ts:29](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/parkingReviews.ts#L29)

##### security?

> `optional` **security?**: `boolean`

Defined in: [api/src/data/parkingReviews.ts:33](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/parkingReviews.ts#L33)

***

### ParkingSummary

Defined in: [api/src/data/parkingReviews.ts:37](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/parkingReviews.ts#L37)

#### Properties

##### avg

> **avg**: `number`

Defined in: [api/src/data/parkingReviews.ts:40](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/parkingReviews.ts#L40)

##### count

> **count**: `number`

Defined in: [api/src/data/parkingReviews.ts:39](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/parkingReviews.ts#L39)

##### food

> **food**: `number`

Defined in: [api/src/data/parkingReviews.ts:43](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/parkingReviews.ts#L43)

##### poiId

> **poiId**: `string`

Defined in: [api/src/data/parkingReviews.ts:38](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/parkingReviews.ts#L38)

##### security

> **security**: `number`

Defined in: [api/src/data/parkingReviews.ts:44](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/parkingReviews.ts#L44)

##### shower

> **shower**: `number`

Defined in: [api/src/data/parkingReviews.ts:41](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/parkingReviews.ts#L41)

##### wc

> **wc**: `number`

Defined in: [api/src/data/parkingReviews.ts:42](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/parkingReviews.ts#L42)

***

### PerDiemTrip

Defined in: [api/src/data/perDiemTrips.ts:5](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/perDiemTrips.ts#L5)

#### Properties

##### created\_at

> **created\_at**: `string`

Defined in: [api/src/data/perDiemTrips.ts:15](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/perDiemTrips.ts#L15)

##### currency

> **currency**: `string`

Defined in: [api/src/data/perDiemTrips.ts:12](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/perDiemTrips.ts#L12)

##### daily\_rate

> **daily\_rate**: `number`

Defined in: [api/src/data/perDiemTrips.ts:11](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/perDiemTrips.ts#L11)

##### destination

> **destination**: `string` \| `null`

Defined in: [api/src/data/perDiemTrips.ts:8](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/perDiemTrips.ts#L8)

##### driver\_name

> **driver\_name**: `string` \| `null`

Defined in: [api/src/data/perDiemTrips.ts:7](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/perDiemTrips.ts#L7)

##### hours

> **hours**: `number`

Defined in: [api/src/data/perDiemTrips.ts:10](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/perDiemTrips.ts#L10)

##### id

> **id**: `string`

Defined in: [api/src/data/perDiemTrips.ts:6](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/perDiemTrips.ts#L6)

##### mode

> **mode**: [`DietMode`](../api/core/src.md#dietmode)

Defined in: [api/src/data/perDiemTrips.ts:9](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/perDiemTrips.ts#L9)

##### note

> **note**: `string` \| `null`

Defined in: [api/src/data/perDiemTrips.ts:14](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/perDiemTrips.ts#L14)

##### trip\_date

> **trip\_date**: `string` \| `null`

Defined in: [api/src/data/perDiemTrips.ts:13](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/perDiemTrips.ts#L13)

***

### PerDiemTripInput

Defined in: [api/src/data/perDiemTrips.ts:18](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/perDiemTrips.ts#L18)

#### Properties

##### currency

> **currency**: `string`

Defined in: [api/src/data/perDiemTrips.ts:26](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/perDiemTrips.ts#L26)

##### dailyRate

> **dailyRate**: `number`

Defined in: [api/src/data/perDiemTrips.ts:25](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/perDiemTrips.ts#L25)

##### destination?

> `optional` **destination?**: `string` \| `null`

Defined in: [api/src/data/perDiemTrips.ts:22](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/perDiemTrips.ts#L22)

##### driverId?

> `optional` **driverId?**: `string` \| `null`

Defined in: [api/src/data/perDiemTrips.ts:21](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/perDiemTrips.ts#L21)

#271: FK do kartoteki — spójna tożsamość kierowcy obok nazwy.

##### driverName?

> `optional` **driverName?**: `string` \| `null`

Defined in: [api/src/data/perDiemTrips.ts:19](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/perDiemTrips.ts#L19)

##### hours

> **hours**: `number`

Defined in: [api/src/data/perDiemTrips.ts:24](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/perDiemTrips.ts#L24)

##### mode

> **mode**: [`DietMode`](../api/core/src.md#dietmode)

Defined in: [api/src/data/perDiemTrips.ts:23](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/perDiemTrips.ts#L23)

##### note?

> `optional` **note?**: `string` \| `null`

Defined in: [api/src/data/perDiemTrips.ts:28](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/perDiemTrips.ts#L28)

##### tripDate?

> `optional` **tripDate?**: `string` \| `null`

Defined in: [api/src/data/perDiemTrips.ts:27](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/perDiemTrips.ts#L27)

***

### PushSubscriptionJSON

Defined in: [api/src/data/push.ts:4](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/push.ts#L4)

#### Properties

##### endpoint

> **endpoint**: `string`

Defined in: [api/src/data/push.ts:5](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/push.ts#L5)

##### keys

> **keys**: `object`

Defined in: [api/src/data/push.ts:6](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/push.ts#L6)

###### auth

> **auth**: `string`

###### p256dh

> **p256dh**: `string`

***

### Rate

Defined in: [api/src/data/rates.ts:4](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/rates.ts#L4)

#### Properties

##### currency

> **currency**: `string`

Defined in: [api/src/data/rates.ts:8](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/rates.ts#L8)

##### id

> **id**: `string`

Defined in: [api/src/data/rates.ts:5](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/rates.ts#L5)

##### ratePerKm

> **ratePerKm**: `number`

Defined in: [api/src/data/rates.ts:7](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/rates.ts#L7)

##### validFrom

> **validFrom**: `string`

Defined in: [api/src/data/rates.ts:9](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/rates.ts#L9)

##### vehicleId

> **vehicleId**: `string` \| `null`

Defined in: [api/src/data/rates.ts:6](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/rates.ts#L6)

***

### RouteStopPoint

Defined in: [api/src/data/driverRoutes.ts:4](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/driverRoutes.ts#L4)

#### Properties

##### label

> **label**: `string`

Defined in: [api/src/data/driverRoutes.ts:7](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/driverRoutes.ts#L7)

##### lat

> **lat**: `number`

Defined in: [api/src/data/driverRoutes.ts:5](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/driverRoutes.ts#L5)

##### lng

> **lng**: `number`

Defined in: [api/src/data/driverRoutes.ts:6](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/driverRoutes.ts#L6)

***

### SavedPlace

Defined in: [api/src/data/savedPlaces.ts:4](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/savedPlaces.ts#L4)

#### Properties

##### category

> **category**: `string`

Defined in: [api/src/data/savedPlaces.ts:7](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/savedPlaces.ts#L7)

##### id

> **id**: `string`

Defined in: [api/src/data/savedPlaces.ts:5](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/savedPlaces.ts#L5)

##### lat

> **lat**: `number`

Defined in: [api/src/data/savedPlaces.ts:8](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/savedPlaces.ts#L8)

##### lng

> **lng**: `number`

Defined in: [api/src/data/savedPlaces.ts:9](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/savedPlaces.ts#L9)

##### name

> **name**: `string`

Defined in: [api/src/data/savedPlaces.ts:6](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/savedPlaces.ts#L6)

***

### SavedPlaceInput

Defined in: [api/src/data/savedPlaces.ts:12](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/savedPlaces.ts#L12)

#### Properties

##### category

> **category**: `string`

Defined in: [api/src/data/savedPlaces.ts:14](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/savedPlaces.ts#L14)

##### lat

> **lat**: `number`

Defined in: [api/src/data/savedPlaces.ts:15](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/savedPlaces.ts#L15)

##### lng

> **lng**: `number`

Defined in: [api/src/data/savedPlaces.ts:16](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/savedPlaces.ts#L16)

##### name

> **name**: `string`

Defined in: [api/src/data/savedPlaces.ts:13](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/savedPlaces.ts#L13)

***

### ServiceTask

Defined in: [api/src/data/service.ts:4](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/service.ts#L4)

#### Properties

##### id

> **id**: `string`

Defined in: [api/src/data/service.ts:5](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/service.ts#L5)

##### interval\_km

> **interval\_km**: `number` \| `null`

Defined in: [api/src/data/service.ts:8](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/service.ts#L8)

##### interval\_months

> **interval\_months**: `number` \| `null`

Defined in: [api/src/data/service.ts:9](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/service.ts#L9)

##### last\_done\_date

> **last\_done\_date**: `string` \| `null`

Defined in: [api/src/data/service.ts:11](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/service.ts#L11)

##### last\_done\_km

> **last\_done\_km**: `number` \| `null`

Defined in: [api/src/data/service.ts:10](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/service.ts#L10)

##### name

> **name**: `string`

Defined in: [api/src/data/service.ts:7](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/service.ts#L7)

##### notes

> **notes**: `string` \| `null`

Defined in: [api/src/data/service.ts:12](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/service.ts#L12)

##### vehicle\_id

> **vehicle\_id**: `string`

Defined in: [api/src/data/service.ts:6](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/service.ts#L6)

***

### ServiceTaskInput

Defined in: [api/src/data/service.ts:15](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/service.ts#L15)

#### Properties

##### intervalKm?

> `optional` **intervalKm?**: `number` \| `null`

Defined in: [api/src/data/service.ts:18](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/service.ts#L18)

##### intervalMonths?

> `optional` **intervalMonths?**: `number` \| `null`

Defined in: [api/src/data/service.ts:19](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/service.ts#L19)

##### lastDoneDate?

> `optional` **lastDoneDate?**: `string` \| `null`

Defined in: [api/src/data/service.ts:21](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/service.ts#L21)

##### lastDoneKm?

> `optional` **lastDoneKm?**: `number` \| `null`

Defined in: [api/src/data/service.ts:20](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/service.ts#L20)

##### name

> **name**: `string`

Defined in: [api/src/data/service.ts:17](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/service.ts#L17)

##### notes?

> `optional` **notes?**: `string` \| `null`

Defined in: [api/src/data/service.ts:22](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/service.ts#L22)

##### vehicleId

> **vehicleId**: `string`

Defined in: [api/src/data/service.ts:16](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/service.ts#L16)

***

### StoredPushSubscription

Defined in: [api/src/data/push.ts:9](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/push.ts#L9)

#### Properties

##### auth

> **auth**: `string`

Defined in: [api/src/data/push.ts:12](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/push.ts#L12)

##### endpoint

> **endpoint**: `string`

Defined in: [api/src/data/push.ts:10](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/push.ts#L10)

##### p256dh

> **p256dh**: `string`

Defined in: [api/src/data/push.ts:11](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/push.ts#L11)

##### user\_id

> **user\_id**: `string`

Defined in: [api/src/data/push.ts:13](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/push.ts#L13)

***

### SupabaseConfig

Defined in: [api/src/client.ts:14](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/client.ts#L14)

#### Properties

##### anonKey

> **anonKey**: `string`

Defined in: [api/src/client.ts:16](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/client.ts#L16)

##### url

> **url**: `string`

Defined in: [api/src/client.ts:15](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/client.ts#L15)

***

### TachoEvent

Defined in: [api/src/data/tachoEvents.ts:18](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/tachoEvents.ts#L18)

#### Properties

##### at

> **at**: `string`

Defined in: [api/src/data/tachoEvents.ts:23](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/tachoEvents.ts#L23)

##### driver\_user\_id

> **driver\_user\_id**: `string`

Defined in: [api/src/data/tachoEvents.ts:20](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/tachoEvents.ts#L20)

##### id

> **id**: `string`

Defined in: [api/src/data/tachoEvents.ts:19](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/tachoEvents.ts#L19)

##### kind

> **kind**: [`TachoEventKind`](../api/api/src.md#tachoeventkind-1)

Defined in: [api/src/data/tachoEvents.ts:21](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/tachoEvents.ts#L21)

##### note

> **note**: `string` \| `null`

Defined in: [api/src/data/tachoEvents.ts:24](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/tachoEvents.ts#L24)

##### rest\_type

> **rest\_type**: [`TachoRestType`](../api/api/src.md#tachoresttype) \| `null`

Defined in: [api/src/data/tachoEvents.ts:22](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/tachoEvents.ts#L22)

***

### TripEventContext

Defined in: [api/src/data/tripEvents.ts:5](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/tripEvents.ts#L5)

#### Properties

##### companyId

> **companyId**: `string`

Defined in: [api/src/data/tripEvents.ts:8](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/tripEvents.ts#L8)

##### deviceId?

> `optional` **deviceId?**: `string`

Defined in: [api/src/data/tripEvents.ts:10](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/tripEvents.ts#L10)

##### driverId

> **driverId**: `string`

Defined in: [api/src/data/tripEvents.ts:9](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/tripEvents.ts#L9)

##### id

> **id**: `string`

Defined in: [api/src/data/tripEvents.ts:7](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/tripEvents.ts#L7)

UUID rekordu wygenerowany na kliencie (offline-first).

***

### UploadDocumentInput

Defined in: [api/src/data/documents.ts:23](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/documents.ts#L23)

#### Properties

##### allowedUserIds?

> `optional` **allowedUserIds?**: `string`[]

Defined in: [api/src/data/documents.ts:29](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/documents.ts#L29)

##### category?

> `optional` **category?**: `string` \| `null`

Defined in: [api/src/data/documents.ts:26](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/documents.ts#L26)

##### expiryDate?

> `optional` **expiryDate?**: `string` \| `null`

Defined in: [api/src/data/documents.ts:27](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/documents.ts#L27)

##### name

> **name**: `string`

Defined in: [api/src/data/documents.ts:24](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/documents.ts#L24)

##### vehicleId?

> `optional` **vehicleId?**: `string` \| `null`

Defined in: [api/src/data/documents.ts:25](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/documents.ts#L25)

##### visibility?

> `optional` **visibility?**: `"company"` \| `"management"` \| `"selected"`

Defined in: [api/src/data/documents.ts:28](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/documents.ts#L28)

***

### VehicleCost

Defined in: [api/src/data/vehicleCosts.ts:5](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/vehicleCosts.ts#L5)

#### Properties

##### amount

> **amount**: `number`

Defined in: [api/src/data/vehicleCosts.ts:9](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/vehicleCosts.ts#L9)

##### category

> **category**: `string`

Defined in: [api/src/data/vehicleCosts.ts:8](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/vehicleCosts.ts#L8)

##### cost\_date

> **cost\_date**: `string`

Defined in: [api/src/data/vehicleCosts.ts:11](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/vehicleCosts.ts#L11)

##### currency

> **currency**: `string`

Defined in: [api/src/data/vehicleCosts.ts:10](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/vehicleCosts.ts#L10)

##### description

> **description**: `string` \| `null`

Defined in: [api/src/data/vehicleCosts.ts:12](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/vehicleCosts.ts#L12)

##### id

> **id**: `string`

Defined in: [api/src/data/vehicleCosts.ts:6](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/vehicleCosts.ts#L6)

##### vehicle\_id

> **vehicle\_id**: `string`

Defined in: [api/src/data/vehicleCosts.ts:7](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/vehicleCosts.ts#L7)

***

### WorkTimeInput

Defined in: [api/src/data/workTimeEntries.ts:15](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/workTimeEntries.ts#L15)

#### Properties

##### driverId?

> `optional` **driverId?**: `string` \| `null`

Defined in: [api/src/data/workTimeEntries.ts:18](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/workTimeEntries.ts#L18)

#271: FK do kartoteki — spójna tożsamość kierowcy obok nazwy.

##### driverName?

> `optional` **driverName?**: `string` \| `null`

Defined in: [api/src/data/workTimeEntries.ts:16](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/workTimeEntries.ts#L16)

##### driving

> **driving**: `number`

Defined in: [api/src/data/workTimeEntries.ts:20](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/workTimeEntries.ts#L20)

##### note?

> `optional` **note?**: `string` \| `null`

Defined in: [api/src/data/workTimeEntries.ts:23](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/workTimeEntries.ts#L23)

##### otherWork

> **otherWork**: `number`

Defined in: [api/src/data/workTimeEntries.ts:21](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/workTimeEntries.ts#L21)

##### rest

> **rest**: `number`

Defined in: [api/src/data/workTimeEntries.ts:22](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/workTimeEntries.ts#L22)

##### workDate

> **workDate**: `string`

Defined in: [api/src/data/workTimeEntries.ts:19](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/workTimeEntries.ts#L19)

***

### WorkTimeRecord

Defined in: [api/src/data/workTimeEntries.ts:4](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/workTimeEntries.ts#L4)

#### Properties

##### created\_at

> **created\_at**: `string`

Defined in: [api/src/data/workTimeEntries.ts:12](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/workTimeEntries.ts#L12)

##### driver\_name

> **driver\_name**: `string` \| `null`

Defined in: [api/src/data/workTimeEntries.ts:6](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/workTimeEntries.ts#L6)

##### driving

> **driving**: `number`

Defined in: [api/src/data/workTimeEntries.ts:8](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/workTimeEntries.ts#L8)

##### id

> **id**: `string`

Defined in: [api/src/data/workTimeEntries.ts:5](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/workTimeEntries.ts#L5)

##### note

> **note**: `string` \| `null`

Defined in: [api/src/data/workTimeEntries.ts:11](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/workTimeEntries.ts#L11)

##### other\_work

> **other\_work**: `number`

Defined in: [api/src/data/workTimeEntries.ts:9](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/workTimeEntries.ts#L9)

##### rest

> **rest**: `number`

Defined in: [api/src/data/workTimeEntries.ts:10](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/workTimeEntries.ts#L10)

##### work\_date

> **work\_date**: `string`

Defined in: [api/src/data/workTimeEntries.ts:7](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/workTimeEntries.ts#L7)

## Type Aliases

### CookieAdapter

> **CookieAdapter** = `ServerOptions`\[`"cookies"`\]

Defined in: [api/src/client.ts:98](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/client.ts#L98)

***

### DevStats

> **DevStats** = `Record`\<`string`, `number`\>

Defined in: [api/src/data/dev.ts:4](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/dev.ts#L4)

***

### ExpenseCategory

> **ExpenseCategory** = *typeof* [`EXPENSE_CATEGORIES`](../api/api/src.md#expense_categories)\[`number`\]

Defined in: [api/src/data/driverExpenses.ts:9](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/driverExpenses.ts#L9)

***

### ExpenseStatus

> **ExpenseStatus** = `"submitted"` \| `"approved"` \| `"rejected"`

Defined in: [api/src/data/driverExpenses.ts:10](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/driverExpenses.ts#L10)

***

### Json

> **Json** = `string` \| `number` \| `boolean` \| `null` \| \{\[`key`: `string`\]: [`Json`](../api/api/src.md#json) \| `undefined`; \} \| [`Json`](../api/api/src.md#json)[]

Defined in: [api/src/database.types.ts:4](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/database.types.ts#L4)

***

### Notification

> **Notification** = `object`

Defined in: [api/src/data/notifications.ts:4](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/notifications.ts#L4)

#### Properties

##### body

> **body**: `string` \| `null`

Defined in: [api/src/data/notifications.ts:8](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/notifications.ts#L8)

##### created\_at

> **created\_at**: `string`

Defined in: [api/src/data/notifications.ts:11](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/notifications.ts#L11)

##### id

> **id**: `string`

Defined in: [api/src/data/notifications.ts:5](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/notifications.ts#L5)

##### read\_at

> **read\_at**: `string` \| `null`

Defined in: [api/src/data/notifications.ts:10](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/notifications.ts#L10)

##### severity

> **severity**: `string`

Defined in: [api/src/data/notifications.ts:9](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/notifications.ts#L9)

##### title

> **title**: `string`

Defined in: [api/src/data/notifications.ts:7](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/notifications.ts#L7)

##### type

> **type**: `string`

Defined in: [api/src/data/notifications.ts:6](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/notifications.ts#L6)

***

### TachoEventKind

> **TachoEventKind** = `"work_start"` \| `"work_end"` \| `"weekly_rest_start"` \| `"weekly_rest_end"` \| `"daily_rest_start"` \| `"daily_rest_end"`

Defined in: [api/src/data/tachoEvents.ts:8](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/tachoEvents.ts#L8)

***

### TachoRestType

> **TachoRestType** = `"regular"` \| `"reduced"`

Defined in: [api/src/data/tachoEvents.ts:16](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/tachoEvents.ts#L16)

***

### TypedSupabaseClient

> **TypedSupabaseClient** = `SupabaseClient`\<[`Database`](../api/api/src.md#database)\>

Defined in: [api/src/client.ts:12](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/client.ts#L12)

Klient Supabase otypowany schematem bazy (generowany z żywej bazy).

## Variables

### CARGO\_PHOTOS\_BUCKET

> `const` **CARGO\_PHOTOS\_BUCKET**: `"cargo-photos"` = `"cargo-photos"`

Defined in: [api/src/data/orderPhotos.ts:5](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/orderPhotos.ts#L5)

***

### DOCUMENTS\_BUCKET

> `const` **DOCUMENTS\_BUCKET**: `"documents"` = `"documents"`

Defined in: [api/src/data/documents.ts:5](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/documents.ts#L5)

***

### EXPENSE\_CATEGORIES

> `const` **EXPENSE\_CATEGORIES**: readonly \[`"toll"`, `"parking"`, `"repair"`, `"wash"`, `"other"`\]

Defined in: [api/src/data/driverExpenses.ts:8](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/driverExpenses.ts#L8)

***

### EXPENSE\_CATEGORY\_LABELS

> `const` **EXPENSE\_CATEGORY\_LABELS**: `Record`\<[`ExpenseCategory`](../api/api/src.md#expensecategory), `string`\>

Defined in: [api/src/data/driverExpenses.ts:12](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/driverExpenses.ts#L12)

## Functions

### acceptInvite()

> **acceptInvite**(`client`, `token`): `Promise`\<`string`\>

Defined in: [api/src/data/invites.ts:22](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/invites.ts#L22)

Akceptuje zaproszenie (zalogowany user) — zwraca id firmy.

#### Parameters

##### client

[`TypedSupabaseClient`](../api/api/src.md#typedsupabaseclient)

##### token

`string`

#### Returns

`Promise`\<`string`\>

***

### addInvoiceItem()

> **addInvoiceItem**(`client`, `invoiceId`, `input`): `Promise`\<`void`\>

Defined in: [api/src/data/invoices.ts:165](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/invoices.ts#L165)

Dodaje pozycję faktury (kwoty i sumy faktury liczy trigger).

#### Parameters

##### client

[`TypedSupabaseClient`](../api/api/src.md#typedsupabaseclient)

##### invoiceId

`string`

##### input

[`InvoiceItemInput`](../api/api/src.md#invoiceiteminput)

#### Returns

`Promise`\<`void`\>

***

### addThreadMembers()

> **addThreadMembers**(`client`, `threadId`, `userIds`): `Promise`\<`void`\>

Defined in: [api/src/data/messages.ts:163](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/messages.ts#L163)

Dodanie członków (zarząd). Duplikaty ignorowane.

#### Parameters

##### client

[`TypedSupabaseClient`](../api/api/src.md#typedsupabaseclient)

##### threadId

`string`

##### userIds

`string`[]

#### Returns

`Promise`\<`void`\>

***

### bootstrapCompany()

> **bootstrapCompany**(`client`, `name`): `Promise`\<`string`\>

Defined in: [api/src/data/memberships.ts:82](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/memberships.ts#L82)

Onboarding: tworzy firmę i członkostwo `owner` dla zalogowanego usera (RPC).

#### Parameters

##### client

[`TypedSupabaseClient`](../api/api/src.md#typedsupabaseclient)

##### name

`string`

#### Returns

`Promise`\<`string`\>

***

### changeMyEmail()

> **changeMyEmail**(`client`, `email`): `Promise`\<`void`\>

Defined in: [api/src/data/profile.ts:42](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/profile.ts#L42)

Zmiana e-maila — Supabase wysyła link potwierdzający na NOWY adres.

#### Parameters

##### client

[`TypedSupabaseClient`](../api/api/src.md#typedsupabaseclient)

##### email

`string`

#### Returns

`Promise`\<`void`\>

***

### changeMyPassword()

> **changeMyPassword**(`client`, `password`): `Promise`\<`void`\>

Defined in: [api/src/data/profile.ts:48](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/profile.ts#L48)

Zmiana hasła zalogowanego użytkownika (min. 8 znaków — walidacja UI).

#### Parameters

##### client

[`TypedSupabaseClient`](../api/api/src.md#typedsupabaseclient)

##### password

`string`

#### Returns

`Promise`\<`void`\>

***

### chatPhotoUrl()

> **chatPhotoUrl**(`client`, `path`): `Promise`\<`string`\>

Defined in: [api/src/data/messages.ts:211](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/messages.ts#L211)

Podpisany URL zdjęcia z czatu (1 h).

#### Parameters

##### client

[`TypedSupabaseClient`](../api/api/src.md#typedsupabaseclient)

##### path

`string`

#### Returns

`Promise`\<`string`\>

***

### checklistPhotoUrl()

> **checklistPhotoUrl**(`client`, `path`): `Promise`\<`string` \| `null`\>

Defined in: [api/src/data/checklists.ts:190](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/checklists.ts#L190)

Podpisany URL do podglądu zdjęcia z checklisty (10 min).

#### Parameters

##### client

[`TypedSupabaseClient`](../api/api/src.md#typedsupabaseclient)

##### path

`string`

#### Returns

`Promise`\<`string` \| `null`\>

***

### createBlankInvoice()

> **createBlankInvoice**(`client`, `companyId`, `input`): `Promise`\<\{ `id`: `string`; `number`: `string`; \}\>

Defined in: [api/src/data/invoices.ts:108](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/invoices.ts#L108)

Tworzy pustą fakturę (bez zlecenia) z dowolnym nabywcą. RPC, owner/dispatcher.

#### Parameters

##### client

[`TypedSupabaseClient`](../api/api/src.md#typedsupabaseclient)

##### companyId

`string`

##### input

[`BlankInvoiceInput`](../api/api/src.md#blankinvoiceinput)

#### Returns

`Promise`\<\{ `id`: `string`; `number`: `string`; \}\>

***

### createInvite()

> **createInvite**(`client`, `opts?`): `Promise`\<`string`\>

Defined in: [api/src/data/invites.ts:6](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/invites.ts#L6)

Tworzy zaproszenie (owner/spedytor) i zwraca surowy token (do linku/QR).

#### Parameters

##### client

[`TypedSupabaseClient`](../api/api/src.md#typedsupabaseclient)

##### opts?

###### email?

`string`

###### permissions?

`Partial`\<`Record`\<`"vehicles"` \| `"drivers"` \| `"cards"` \| `"forms"` \| `"reports"` \| `"map"` \| `"stats"` \| `"settlements"` \| `"orders"` \| `"checklists"` \| `"documents"` \| `"damages"`, `"none"` \| `"view"` \| `"edit"`\>\>

###### role?

`"developer"` \| `"owner"` \| `"dispatcher"` \| `"driver"`

###### vehicleId?

`string`

#### Returns

`Promise`\<`string`\>

***

### createInvoiceFromOrder()

> **createInvoiceFromOrder**(`client`, `orderId`, `vatRate?`): `Promise`\<\{ `gross`: `number`; `id`: `string`; `number`: `string`; \}\>

Defined in: [api/src/data/invoices.ts:59](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/invoices.ts#L59)

Wystawia fakturę ze zlecenia (RPC, owner/dispatcher). Gdy `vatRate` pominięty,
RPC bierze domyślny VAT z ustawień firmy. Zwraca numer + brutto.

#### Parameters

##### client

[`TypedSupabaseClient`](../api/api/src.md#typedsupabaseclient)

##### orderId

`string`

##### vatRate?

`number`

#### Returns

`Promise`\<\{ `gross`: `number`; `id`: `string`; `number`: `string`; \}\>

***

### createSupabaseBrowserClient()

> **createSupabaseBrowserClient**(`cfg?`): [`TypedSupabaseClient`](../api/api/src.md#typedsupabaseclient)

Defined in: [api/src/client.ts:35](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/client.ts#L35)

Klient przeglądarkowy (komponenty klienta).

#### Parameters

##### cfg?

`Partial`\<[`SupabaseConfig`](../api/api/src.md#supabaseconfig)\>

#### Returns

[`TypedSupabaseClient`](../api/api/src.md#typedsupabaseclient)

***

### createSupabaseMobileClient()

> **createSupabaseMobileClient**(`storage`, `cfg?`): [`TypedSupabaseClient`](../api/api/src.md#typedsupabaseclient)

Defined in: [api/src/client.ts:73](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/client.ts#L73)

#### Parameters

##### storage

[`MobileAuthStorage`](../api/api/src.md#mobileauthstorage)

##### cfg?

`Partial`\<[`SupabaseConfig`](../api/api/src.md#supabaseconfig)\>

#### Returns

[`TypedSupabaseClient`](../api/api/src.md#typedsupabaseclient)

***

### createSupabaseServerClient()

> **createSupabaseServerClient**(`cookies`, `cfg?`): `SupabaseClient`

Defined in: [api/src/client.ts:101](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/client.ts#L101)

Klient serwerowy (Server Components / middleware) — adapter ciasteczek od frameworka.

#### Parameters

##### cookies

`CookieMethodsServer`

##### cfg?

`Partial`\<[`SupabaseConfig`](../api/api/src.md#supabaseconfig)\>

#### Returns

`SupabaseClient`

***

### createThread()

> **createThread**(`client`, `companyId`, `name`, `memberIds`): `Promise`\<[`ChatThread`](../api/api/src.md#chatthread)\>

Defined in: [api/src/data/messages.ts:112](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/messages.ts#L112)

Nowy kanał + członkowie (twórca dopisywany automatycznie). Zarząd.

#### Parameters

##### client

[`TypedSupabaseClient`](../api/api/src.md#typedsupabaseclient)

##### companyId

`string`

##### name

`string`

##### memberIds

`string`[]

#### Returns

`Promise`\<[`ChatThread`](../api/api/src.md#chatthread)\>

***

### deleteContractor()

> **deleteContractor**(`client`, `id`): `Promise`\<`void`\>

Defined in: [api/src/data/contractors.ts:78](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/contractors.ts#L78)

Usuwa kontrahenta. RLS: owner/dispatcher.

#### Parameters

##### client

[`TypedSupabaseClient`](../api/api/src.md#typedsupabaseclient)

##### id

`string`

#### Returns

`Promise`\<`void`\>

***

### deleteDamageClaim()

> **deleteDamageClaim**(`client`, `id`): `Promise`\<`void`\>

Defined in: [api/src/data/damageClaims.ts:93](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/damageClaims.ts#L93)

Usuwa szkodę. RLS: owner/dispatcher.

#### Parameters

##### client

[`TypedSupabaseClient`](../api/api/src.md#typedsupabaseclient)

##### id

`string`

#### Returns

`Promise`\<`void`\>

***

### deleteDefect()

> **deleteDefect**(`client`, `id`): `Promise`\<`void`\>

Defined in: [api/src/data/defects.ts:64](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/defects.ts#L64)

#### Parameters

##### client

[`TypedSupabaseClient`](../api/api/src.md#typedsupabaseclient)

##### id

`string`

#### Returns

`Promise`\<`void`\>

***

### deleteDocument()

> **deleteDocument**(`client`, `doc`): `Promise`\<`void`\>

Defined in: [api/src/data/documents.ts:114](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/documents.ts#L114)

Kasuje obiekt w Storage i metadane (owner/dispatcher wg RLS).

#### Parameters

##### client

[`TypedSupabaseClient`](../api/api/src.md#typedsupabaseclient)

##### doc

[`DocumentMeta`](../api/api/src.md#documentmeta)

#### Returns

`Promise`\<`void`\>

***

### deleteDriver()

> **deleteDriver**(`client`, `driverId`): `Promise`\<`void`\>

Defined in: [api/src/data/drivers.ts:104](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/drivers.ts#L104)

#### Parameters

##### client

[`TypedSupabaseClient`](../api/api/src.md#typedsupabaseclient)

##### driverId

`string`

#### Returns

`Promise`\<`void`\>

***

### deleteDriverExpense()

> **deleteDriverExpense**(`client`, `id`): `Promise`\<`void`\>

Defined in: [api/src/data/driverExpenses.ts:96](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/driverExpenses.ts#L96)

Usunięcie własnego, nierozpatrzonego wpisu.

#### Parameters

##### client

[`TypedSupabaseClient`](../api/api/src.md#typedsupabaseclient)

##### id

`string`

#### Returns

`Promise`\<`void`\>

***

### deleteDriverPayout()

> **deleteDriverPayout**(`client`, `id`): `Promise`\<`void`\>

Defined in: [api/src/data/driverPayouts.ts:68](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/driverPayouts.ts#L68)

Usuwa pozycję rozliczenia. RLS: owner/dispatcher.

#### Parameters

##### client

[`TypedSupabaseClient`](../api/api/src.md#typedsupabaseclient)

##### id

`string`

#### Returns

`Promise`\<`void`\>

***

### deleteExpoPushToken()

> **deleteExpoPushToken**(`client`, `token`): `Promise`\<`void`\>

Defined in: [api/src/data/expoPush.ts:32](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/expoPush.ts#L32)

Usuwa token (np. przy wylogowaniu / cofnięciu zgody). RLS: właściciel.

#### Parameters

##### client

[`TypedSupabaseClient`](../api/api/src.md#typedsupabaseclient)

##### token

`string`

#### Returns

`Promise`\<`void`\>

***

### deleteFuelCard()

> **deleteFuelCard**(`client`, `cardId`): `Promise`\<`void`\>

Defined in: [api/src/data/fuelCards.ts:80](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/fuelCards.ts#L80)

Usuwa kartę (kaskadowo: przypisania). RLS: owner.

#### Parameters

##### client

[`TypedSupabaseClient`](../api/api/src.md#typedsupabaseclient)

##### cardId

`string`

#### Returns

`Promise`\<`void`\>

***

### deleteInvoice()

> **deleteInvoice**(`client`, `id`): `Promise`\<`void`\>

Defined in: [api/src/data/invoices.ts:72](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/invoices.ts#L72)

#### Parameters

##### client

[`TypedSupabaseClient`](../api/api/src.md#typedsupabaseclient)

##### id

`string`

#### Returns

`Promise`\<`void`\>

***

### deleteInvoiceItem()

> **deleteInvoiceItem**(`client`, `id`): `Promise`\<`void`\>

Defined in: [api/src/data/invoices.ts:181](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/invoices.ts#L181)

#### Parameters

##### client

[`TypedSupabaseClient`](../api/api/src.md#typedsupabaseclient)

##### id

`string`

#### Returns

`Promise`\<`void`\>

***

### deleteMyPosition()

> **deleteMyPosition**(`client`): `Promise`\<`void`\>

Defined in: [api/src/data/positions.ts:49](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/positions.ts#L49)

Usuwa własną pozycję (kierowca wyłączył udostępnianie).

#### Parameters

##### client

[`TypedSupabaseClient`](../api/api/src.md#typedsupabaseclient)

#### Returns

`Promise`\<`void`\>

***

### deleteOrder()

> **deleteOrder**(`client`, `id`): `Promise`\<`void`\>

Defined in: [api/src/data/orders.ts:115](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/orders.ts#L115)

#### Parameters

##### client

[`TypedSupabaseClient`](../api/api/src.md#typedsupabaseclient)

##### id

`string`

#### Returns

`Promise`\<`void`\>

***

### deleteOrderPhoto()

> **deleteOrderPhoto**(`client`, `photo`): `Promise`\<`void`\>

Defined in: [api/src/data/orderPhotos.ts:127](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/orderPhotos.ts#L127)

Kasuje zdjęcie (Storage + metadane). RLS: owner/dispatcher.

#### Parameters

##### client

[`TypedSupabaseClient`](../api/api/src.md#typedsupabaseclient)

##### photo

[`OrderPhoto`](../api/api/src.md#orderphoto)

#### Returns

`Promise`\<`void`\>

***

### deletePerDiemTrip()

> **deletePerDiemTrip**(`client`, `id`): `Promise`\<`void`\>

Defined in: [api/src/data/perDiemTrips.ts:75](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/perDiemTrips.ts#L75)

Usuwa podróż. RLS: owner/dispatcher.

#### Parameters

##### client

[`TypedSupabaseClient`](../api/api/src.md#typedsupabaseclient)

##### id

`string`

#### Returns

`Promise`\<`void`\>

***

### deletePushSubscription()

> **deletePushSubscription**(`client`, `endpoint`): `Promise`\<`void`\>

Defined in: [api/src/data/push.ts:37](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/push.ts#L37)

Usuwa subskrypcję po `endpoint` (np. po wyłączeniu push w przeglądarce).

#### Parameters

##### client

[`TypedSupabaseClient`](../api/api/src.md#typedsupabaseclient)

##### endpoint

`string`

#### Returns

`Promise`\<`void`\>

***

### deleteSavedPlace()

> **deleteSavedPlace**(`client`, `id`): `Promise`\<`void`\>

Defined in: [api/src/data/savedPlaces.ts:57](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/savedPlaces.ts#L57)

Usuwa zapisane miejsce. RLS: autor lub owner/dispatcher.

#### Parameters

##### client

[`TypedSupabaseClient`](../api/api/src.md#typedsupabaseclient)

##### id

`string`

#### Returns

`Promise`\<`void`\>

***

### deleteServiceTask()

> **deleteServiceTask**(`client`, `id`): `Promise`\<`void`\>

Defined in: [api/src/data/service.ts:98](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/service.ts#L98)

#### Parameters

##### client

[`TypedSupabaseClient`](../api/api/src.md#typedsupabaseclient)

##### id

`string`

#### Returns

`Promise`\<`void`\>

***

### deleteThread()

> **deleteThread**(`client`, `threadId`): `Promise`\<`void`\>

Defined in: [api/src/data/messages.ts:144](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/messages.ts#L144)

Usunięcie kanału wraz z wiadomościami (zarząd).

#### Parameters

##### client

[`TypedSupabaseClient`](../api/api/src.md#typedsupabaseclient)

##### threadId

`string`

#### Returns

`Promise`\<`void`\>

***

### deleteVehicle()

> **deleteVehicle**(`client`, `vehicleId`): `Promise`\<`void`\>

Defined in: [api/src/data/vehicles.ts:93](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/vehicles.ts#L93)

Usuwa pojazd (kaskadowo: powiązane wpisy paliwa/AdBlue/trip). RLS: owner/dispatcher.

#### Parameters

##### client

[`TypedSupabaseClient`](../api/api/src.md#typedsupabaseclient)

##### vehicleId

`string`

#### Returns

`Promise`\<`void`\>

***

### deleteVehicleCost()

> **deleteVehicleCost**(`client`, `id`): `Promise`\<`void`\>

Defined in: [api/src/data/vehicleCosts.ts:56](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/vehicleCosts.ts#L56)

Usuwa koszt pojazdu. RLS: owner/dispatcher.

#### Parameters

##### client

[`TypedSupabaseClient`](../api/api/src.md#typedsupabaseclient)

##### id

`string`

#### Returns

`Promise`\<`void`\>

***

### deleteWorkTimeEntry()

> **deleteWorkTimeEntry**(`client`, `id`): `Promise`\<`void`\>

Defined in: [api/src/data/workTimeEntries.ts:67](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/workTimeEntries.ts#L67)

Usuwa wpis czasu pracy. RLS: owner/dispatcher.

#### Parameters

##### client

[`TypedSupabaseClient`](../api/api/src.md#typedsupabaseclient)

##### id

`string`

#### Returns

`Promise`\<`void`\>

***

### duplicateInvoice()

> **duplicateInvoice**(`client`, `invoiceId`): `Promise`\<\{ `id`: `string`; `number`: `string`; \}\>

Defined in: [api/src/data/invoices.ts:187](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/invoices.ts#L187)

Tworzy duplikat faktury (z pozycjami) pod nowym numerem (RPC, owner/dispatcher).

#### Parameters

##### client

[`TypedSupabaseClient`](../api/api/src.md#typedsupabaseclient)

##### invoiceId

`string`

#### Returns

`Promise`\<\{ `id`: `string`; `number`: `string`; \}\>

***

### expensePhotoUrl()

> **expensePhotoUrl**(`client`, `path`): `Promise`\<`string`\>

Defined in: [api/src/data/driverExpenses.ts:120](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/driverExpenses.ts#L120)

Podpisany URL zdjęcia paragonu (podgląd w panelu).

#### Parameters

##### client

[`TypedSupabaseClient`](../api/api/src.md#typedsupabaseclient)

##### path

`string`

#### Returns

`Promise`\<`string`\>

***

### fetchOrderTracking()

> **fetchOrderTracking**(`client`, `token`): `Promise`\<[`OrderTracking`](../api/api/src.md#ordertracking) \| `null`\>

Defined in: [api/src/data/orderTracking.ts:38](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/orderTracking.ts#L38)

Publiczny status przesyłki po tokenie (działa też bez sesji — anon).

#### Parameters

##### client

[`TypedSupabaseClient`](../api/api/src.md#typedsupabaseclient)

##### token

`string`

#### Returns

`Promise`\<[`OrderTracking`](../api/api/src.md#ordertracking) \| `null`\>

***

### fuelLogToRow()

> **fuelLogToRow**(`input`, `ctx`): `object`

Defined in: [api/src/data/fuelLogs.ts:14](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/fuelLogs.ts#L14)

Mapuje zwalidowany input formularza na wiersz tabeli (snake_case + WKT dla PostGIS).

#### Parameters

##### input

###### comment?

`string` = `...`

###### fuelCardId?

`string` = `...`

###### isFull

`boolean` = `...`

Czy zatankowano „do pełna" — do liczenia spalania (full-to-full).

###### liters

`number` = `...`

###### odometerKm

`number` = `...`

###### paymentMethod

`"card"` \| `"cash"` = `...`

###### priceTotal?

`number` = `...`

###### station

\{ `city?`: `string`; `company?`: `string`; `country`: `string`; `lat?`: `number`; `lng?`: `number`; `location?`: `string`; `postcode?`: `string`; \} = `geoLocationSchema`

###### station.city?

`string` = `...`

###### station.company?

`string` = `...`

Nazwa firmy w miejscu (opcjonalnie).

###### station.country

`string` = `...`

###### station.lat?

`number` = `...`

###### station.lng?

`number` = `...`

###### station.location?

`string` = `...`

###### station.postcode?

`string` = `...`

Kod pocztowy (np. wymagany dla UK/Anglii).

###### vehicleId

`string` = `...`

##### ctx

[`FuelLogContext`](../api/api/src.md#fuellogcontext)

#### Returns

`object`

##### comment

> **comment**: `string` \| `null`

##### company\_id

> **company\_id**: `string` = `ctx.companyId`

##### device\_id

> **device\_id**: `string` \| `null`

##### driver\_id

> **driver\_id**: `string` = `ctx.driverId`

##### fuel\_card\_id

> **fuel\_card\_id**: `string` \| `null`

##### geo

> **geo**: `string` \| `null`

##### id

> **id**: `string` = `ctx.id`

##### is\_full

> **is\_full**: `boolean`

##### liters

> **liters**: `number` = `input.liters`

##### odometer\_km

> **odometer\_km**: `number` = `input.odometerKm`

##### payment\_method

> **payment\_method**: `"card"` \| `"cash"` = `input.paymentMethod`

##### price\_total

> **price\_total**: `number` \| `null`

##### station\_city

> **station\_city**: `string` \| `null`

##### station\_company

> **station\_company**: `string` \| `null`

##### station\_country

> **station\_country**: `string` = `input.station.country`

##### station\_loc

> **station\_loc**: `string` \| `null`

##### station\_postcode

> **station\_postcode**: `string` \| `null`

##### vehicle\_id

> **vehicle\_id**: `string` = `input.vehicleId`

***

### generateExpiryNotifications()

> **generateExpiryNotifications**(`client`, `companyId`): `Promise`\<`void`\>

Defined in: [api/src/data/notifications.ts:59](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/notifications.ts#L59)

Generuje powiadomienia o wygasających terminach (RPC, owner/dispatcher; idempotentne).

#### Parameters

##### client

[`TypedSupabaseClient`](../api/api/src.md#typedsupabaseclient)

##### companyId

`string`

#### Returns

`Promise`\<`void`\>

***

### getActiveMembership()

> **getActiveMembership**(`client`): `Promise`\<[`ActiveMembership`](../api/api/src.md#activemembership) \| `null`\>

Defined in: [api/src/data/memberships.ts:15](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/memberships.ts#L15)

Aktywne członkostwo zalogowanego użytkownika (null gdy brak sesji lub firmy).

#### Parameters

##### client

[`TypedSupabaseClient`](../api/api/src.md#typedsupabaseclient)

#### Returns

`Promise`\<[`ActiveMembership`](../api/api/src.md#activemembership) \| `null`\>

***

### getCompany()

> **getCompany**(`client`, `companyId`): `Promise`\<[`Company`](../api/api/src.md#company) \| `null`\>

Defined in: [api/src/data/companies.ts:19](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/companies.ts#L19)

Dane firmy (RLS: tylko własna firma). Null gdy brak dostępu.

#### Parameters

##### client

[`TypedSupabaseClient`](../api/api/src.md#typedsupabaseclient)

##### companyId

`string`

#### Returns

`Promise`\<[`Company`](../api/api/src.md#company) \| `null`\>

***

### getDevStats()

> **getDevStats**(`client`): `Promise`\<[`DevStats`](../api/api/src.md#devstats)\>

Defined in: [api/src/data/dev.ts:7](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/dev.ts#L7)

Liczniki encji (RPC dev_stats, security definer + is_developer).

#### Parameters

##### client

[`TypedSupabaseClient`](../api/api/src.md#typedsupabaseclient)

#### Returns

`Promise`\<[`DevStats`](../api/api/src.md#devstats)\>

***

### getDocumentUrl()

> **getDocumentUrl**(`client`, `path`, `expiresIn?`): `Promise`\<`string`\>

Defined in: [api/src/data/documents.ts:101](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/documents.ts#L101)

Podpisany URL do pobrania (bucket prywatny). Domyślnie ważny 60 s.

#### Parameters

##### client

[`TypedSupabaseClient`](../api/api/src.md#typedsupabaseclient)

##### path

`string`

##### expiresIn?

`number` = `60`

#### Returns

`Promise`\<`string`\>

***

### getDriverDocuments()

> **getDriverDocuments**(`client`, `driverId`): `Promise`\<\{ `idCard`: `string` \| `null`; `license`: `string` \| `null`; `passport`: `string` \| `null`; \}\>

Defined in: [api/src/data/drivers.ts:98](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/drivers.ts#L98)

Odczyt (deszyfrowanie) numerów dokumentów — RPC, owner/dispatcher, audytowane.

#### Parameters

##### client

[`TypedSupabaseClient`](../api/api/src.md#typedsupabaseclient)

##### driverId

`string`

#### Returns

`Promise`\<\{ `idCard`: `string` \| `null`; `license`: `string` \| `null`; `passport`: `string` \| `null`; \}\>

***

### getFuelCardPin()

> **getFuelCardPin**(`client`, `cardId`): `Promise`\<`string`\>

Defined in: [api/src/data/fuelCards.ts:92](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/fuelCards.ts#L92)

Odczytuje (deszyfruje) PIN karty — RPC, członek firmy; audytowane.

#### Parameters

##### client

[`TypedSupabaseClient`](../api/api/src.md#typedsupabaseclient)

##### cardId

`string`

#### Returns

`Promise`\<`string`\>

***

### getFuelLog()

> **getFuelLog**(`client`, `id`, `table?`): `Promise`\<\{ `comment`: `string` \| `null`; `company_id`: `string`; `created_at`: `string`; `device_id`: `string` \| `null`; `driver_id`: `string`; `fuel_card_id`: `string` \| `null`; `geo`: `unknown`; `id`: `string`; `is_full`: `boolean`; `liters`: `number`; `odometer_km`: `number`; `payment_method`: `"card"` \| `"cash"`; `price_total`: `number` \| `null`; `revision`: `number`; `station_city`: `string` \| `null`; `station_company`: `string` \| `null`; `station_country`: `string`; `station_loc`: `string` \| `null`; `station_postcode`: `string` \| `null`; `synced_at`: `string` \| `null`; `updated_at`: `string`; `vehicle_id`: `string`; \} \| \{ `comment`: `string` \| `null`; `company_id`: `string`; `created_at`: `string`; `device_id`: `string` \| `null`; `driver_id`: `string`; `fuel_card_id`: `string` \| `null`; `geo`: `unknown`; `id`: `string`; `is_full`: `boolean`; `liters`: `number`; `odometer_km`: `number`; `payment_method`: `"card"` \| `"cash"`; `price_total`: `number` \| `null`; `revision`: `number`; `station_city`: `string` \| `null`; `station_company`: `string` \| `null`; `station_country`: `string`; `station_loc`: `string` \| `null`; `station_postcode`: `string` \| `null`; `synced_at`: `string` \| `null`; `updated_at`: `string`; `vehicle_id`: `string`; \}\>

Defined in: [api/src/data/fuelLogs.ts:61](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/fuelLogs.ts#L61)

Pojedynczy wpis (do edycji).

#### Parameters

##### client

[`TypedSupabaseClient`](../api/api/src.md#typedsupabaseclient)

##### id

`string`

##### table?

`"adblue_logs"` \| `"fuel_logs"`

#### Returns

`Promise`\<\{ `comment`: `string` \| `null`; `company_id`: `string`; `created_at`: `string`; `device_id`: `string` \| `null`; `driver_id`: `string`; `fuel_card_id`: `string` \| `null`; `geo`: `unknown`; `id`: `string`; `is_full`: `boolean`; `liters`: `number`; `odometer_km`: `number`; `payment_method`: `"card"` \| `"cash"`; `price_total`: `number` \| `null`; `revision`: `number`; `station_city`: `string` \| `null`; `station_company`: `string` \| `null`; `station_country`: `string`; `station_loc`: `string` \| `null`; `station_postcode`: `string` \| `null`; `synced_at`: `string` \| `null`; `updated_at`: `string`; `vehicle_id`: `string`; \} \| \{ `comment`: `string` \| `null`; `company_id`: `string`; `created_at`: `string`; `device_id`: `string` \| `null`; `driver_id`: `string`; `fuel_card_id`: `string` \| `null`; `geo`: `unknown`; `id`: `string`; `is_full`: `boolean`; `liters`: `number`; `odometer_km`: `number`; `payment_method`: `"card"` \| `"cash"`; `price_total`: `number` \| `null`; `revision`: `number`; `station_city`: `string` \| `null`; `station_company`: `string` \| `null`; `station_country`: `string`; `station_loc`: `string` \| `null`; `station_postcode`: `string` \| `null`; `synced_at`: `string` \| `null`; `updated_at`: `string`; `vehicle_id`: `string`; \}\>

***

### getMyDriverIdentity()

> **getMyDriverIdentity**(`client`): `Promise`\<\{ `firstName`: `string`; `lastName`: `string`; \} \| `null`\>

Defined in: [api/src/data/drivers.ts:125](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/drivers.ts#L125)

#314: własne imię i nazwisko kierowcy (RPC — deszyfrowany wiersz user_id = auth.uid()).

#### Parameters

##### client

[`TypedSupabaseClient`](../api/api/src.md#typedsupabaseclient)

#### Returns

`Promise`\<\{ `firstName`: `string`; `lastName`: `string`; \} \| `null`\>

***

### getOrderPhotoUrl()

> **getOrderPhotoUrl**(`client`, `path`, `expiresIn?`): `Promise`\<`string`\>

Defined in: [api/src/data/orderPhotos.ts:114](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/orderPhotos.ts#L114)

Podpisany URL do podglądu (bucket prywatny). Domyślnie ważny 5 min.

#### Parameters

##### client

[`TypedSupabaseClient`](../api/api/src.md#typedsupabaseclient)

##### path

`string`

##### expiresIn?

`number` = `300`

#### Returns

`Promise`\<`string`\>

***

### getOrderTrackingToken()

> **getOrderTrackingToken**(`client`, `orderId`): `Promise`\<`string`\>

Defined in: [api/src/data/orderTracking.ts:24](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/orderTracking.ts#L24)

Token śledzenia zlecenia (RLS: członek firmy).

#### Parameters

##### client

[`TypedSupabaseClient`](../api/api/src.md#typedsupabaseclient)

##### orderId

`string`

#### Returns

`Promise`\<`string`\>

***

### getSettlementSettings()

> **getSettlementSettings**(`client`, `companyId`): `Promise`\<[`SettlementSettings`](../api/core/src.md#settlementsettings)\>

Defined in: [api/src/data/settlementSettings.ts:6](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/settlementSettings.ts#L6)

Ustawienia firmy — gdy brak wiersza, zwraca domyślne (seed z formularza wzorcowego).

#### Parameters

##### client

[`TypedSupabaseClient`](../api/api/src.md#typedsupabaseclient)

##### companyId

`string`

#### Returns

`Promise`\<[`SettlementSettings`](../api/core/src.md#settlementsettings)\>

***

### getTripEvent()

> **getTripEvent**(`client`, `id`): `Promise`\<\{ `action`: `"other"` \| `"load"` \| `"unload"` \| `"transshipment"` \| `"start"` \| `"end"` \| `"service"`; `amount`: `number` \| `null`; `comment`: `string` \| `null`; `company`: `string` \| `null`; `company_id`: `string`; `country`: `string`; `created_at`: `string`; `device_id`: `string` \| `null`; `driver_id`: `string`; `from_vehicle_reg`: `string` \| `null`; `geo`: `unknown`; `id`: `string`; `location`: `string` \| `null`; `odometer_km`: `number`; `order_id`: `string` \| `null`; `postcode`: `string` \| `null`; `revision`: `number`; `synced_at`: `string` \| `null`; `to_vehicle_reg`: `string` \| `null`; `updated_at`: `string`; `vehicle_id`: `string`; `weight_kg`: `number` \| `null`; \}\>

Defined in: [api/src/data/tripEvents.ts:61](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/tripEvents.ts#L61)

Pojedyncze zdarzenie Trip (do edycji).

#### Parameters

##### client

[`TypedSupabaseClient`](../api/api/src.md#typedsupabaseclient)

##### id

`string`

#### Returns

`Promise`\<\{ `action`: `"other"` \| `"load"` \| `"unload"` \| `"transshipment"` \| `"start"` \| `"end"` \| `"service"`; `amount`: `number` \| `null`; `comment`: `string` \| `null`; `company`: `string` \| `null`; `company_id`: `string`; `country`: `string`; `created_at`: `string`; `device_id`: `string` \| `null`; `driver_id`: `string`; `from_vehicle_reg`: `string` \| `null`; `geo`: `unknown`; `id`: `string`; `location`: `string` \| `null`; `odometer_km`: `number`; `order_id`: `string` \| `null`; `postcode`: `string` \| `null`; `revision`: `number`; `synced_at`: `string` \| `null`; `to_vehicle_reg`: `string` \| `null`; `updated_at`: `string`; `vehicle_id`: `string`; `weight_kg`: `number` \| `null`; \}\>

***

### insertChecklistSubmission()

> **insertChecklistSubmission**(`client`, `companyId`, `input`): `Promise`\<`string`\>

Defined in: [api/src/data/checklists.ts:121](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/checklists.ts#L121)

Zgłoszenie kierowcy — driver_id/driver_user_id dopina trigger po auth.uid().

#### Parameters

##### client

[`TypedSupabaseClient`](../api/api/src.md#typedsupabaseclient)

##### companyId

`string`

##### input

[`ChecklistSubmissionInput`](../api/api/src.md#checklistsubmissioninput)

#### Returns

`Promise`\<`string`\>

***

### insertDamageClaim()

> **insertDamageClaim**(`client`, `input`, `companyId`): `Promise`\<`string`\>

Defined in: [api/src/data/damageClaims.ts:55](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/damageClaims.ts#L55)

Dodaje szkodę. RLS: owner/dispatcher. Zwraca id.

#### Parameters

##### client

[`TypedSupabaseClient`](../api/api/src.md#typedsupabaseclient)

##### input

[`DamageClaimInput`](../api/api/src.md#damageclaiminput)

##### companyId

`string`

#### Returns

`Promise`\<`string`\>

***

### insertDefect()

> **insertDefect**(`client`, `input`, `ctx`): `Promise`\<`string`\>

Defined in: [api/src/data/defects.ts:22](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/defects.ts#L22)

#### Parameters

##### client

[`TypedSupabaseClient`](../api/api/src.md#typedsupabaseclient)

##### input

###### dashboardLight

`boolean` = `...`

###### description

`string` = `...`

###### part

`string` = `...`

###### severity

`"low"` \| `"medium"` \| `"high"` = `...`

###### side?

`string` = `...`

###### status

`"in_progress"` \| `"open"` \| `"resolved"` = `...`

###### vehicleId

`string` = `...`

##### ctx

###### companyId

`string`

###### reportedBy

`string`

#### Returns

`Promise`\<`string`\>

***

### insertDriver()

> **insertDriver**(`client`, `input`, `companyId`): `Promise`\<`string`\>

Defined in: [api/src/data/drivers.ts:69](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/drivers.ts#L69)

#### Parameters

##### client

[`TypedSupabaseClient`](../api/api/src.md#typedsupabaseclient)

##### input

###### adrExpiry?

`string` = `...`

###### birthDate?

`string` = `...`

###### code95Expiry?

`string` = `...`

###### firstName

`string` = `...`

###### idCardExpiry?

`string` = `...`

###### idCardNumber?

`string` = `...`

###### lastName

`string` = `...`

###### licenseCategories

`string`[] = `...`

###### licenseExpiry?

`string` = `...`

###### licenseNumber?

`string` = `...`

###### medicalExpiry?

`string` = `...`

###### notes?

`string` = `...`

###### passportExpiry?

`string` = `...`

###### passportNumber?

`string` = `...`

###### psychotechExpiry?

`string` = `...`

###### qualificationDetails

`object`[] = `...`

#319: uprawnienia (UDT/HDS itd.) z numerem dokumentu i datą ważności.

###### qualifications

`string`[] = `...`

##### companyId

`string`

#### Returns

`Promise`\<`string`\>

***

### insertDriverExpense()

> **insertDriverExpense**(`client`, `input`): `Promise`\<`string`\>

Defined in: [api/src/data/driverExpenses.ts:63](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/driverExpenses.ts#L63)

Dodaje wydatek we własnym imieniu (RLS wymusza user_id = auth.uid()).

#### Parameters

##### client

[`TypedSupabaseClient`](../api/api/src.md#typedsupabaseclient)

##### input

[`DriverExpenseInput`](../api/api/src.md#driverexpenseinput)

#### Returns

`Promise`\<`string`\>

***

### insertDriverPayout()

> **insertDriverPayout**(`client`, `input`, `companyId`): `Promise`\<`string`\>

Defined in: [api/src/data/driverPayouts.ts:44](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/driverPayouts.ts#L44)

Dodaje pozycję rozliczenia. RLS: owner/dispatcher. Zwraca id.

#### Parameters

##### client

[`TypedSupabaseClient`](../api/api/src.md#typedsupabaseclient)

##### input

[`DriverPayoutInput`](../api/api/src.md#driverpayoutinput)

##### companyId

`string`

#### Returns

`Promise`\<`string`\>

***

### insertFuelCard()

> **insertFuelCard**(`client`, `input`, `companyId`): `Promise`\<`string`\>

Defined in: [api/src/data/fuelCards.ts:41](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/fuelCards.ts#L41)

Dodaje kartę (bez PIN-u — PIN ustawiany osobno przez `setFuelCardPin`). RLS: owner.

#### Parameters

##### client

[`TypedSupabaseClient`](../api/api/src.md#typedsupabaseclient)

##### input

###### cardNumberMasked

`string` = `...`

###### discountPercent

`number` = `...`

###### notes?

`string` = `...`

###### pin?

`string` = `...`

PIN tylko na wejściu — w bazie przechowywany zaszyfrowany (nigdy plaintext).

###### provider

`"dkv"` \| `"eurowag"` \| `"shell"` \| `"bp"` \| `"circlek"` \| `"e100"` \| `"uta"` \| `"as24"` \| `"aral"` \| `"omv"` \| `"routex"` \| `"logpay"` \| `"esso"` \| `"totalenergies"` \| `"tankpool24"` \| `"morganfuels"` \| `"iqcard"` \| `"other"` = `...`

###### validUntil?

`string` = `...`

###### vehicleId?

`string` = `...`

Karta przypisana do pojazdu (opcjonalnie) — dla widoczności która karta do którego auta.

##### companyId

`string`

#### Returns

`Promise`\<`string`\>

***

### insertFuelLog()

> **insertFuelLog**(`client`, `input`, `ctx`, `table?`): `Promise`\<\{ `comment`: `string` \| `null`; `company_id`: `string`; `created_at`: `string`; `device_id`: `string` \| `null`; `driver_id`: `string`; `fuel_card_id`: `string` \| `null`; `geo`: `unknown`; `id`: `string`; `is_full`: `boolean`; `liters`: `number`; `odometer_km`: `number`; `payment_method`: `"card"` \| `"cash"`; `price_total`: `number` \| `null`; `revision`: `number`; `station_city`: `string` \| `null`; `station_company`: `string` \| `null`; `station_country`: `string`; `station_loc`: `string` \| `null`; `station_postcode`: `string` \| `null`; `synced_at`: `string` \| `null`; `updated_at`: `string`; `vehicle_id`: `string`; \} \| \{ `comment`: `string` \| `null`; `company_id`: `string`; `created_at`: `string`; `device_id`: `string` \| `null`; `driver_id`: `string`; `fuel_card_id`: `string` \| `null`; `geo`: `unknown`; `id`: `string`; `is_full`: `boolean`; `liters`: `number`; `odometer_km`: `number`; `payment_method`: `"card"` \| `"cash"`; `price_total`: `number` \| `null`; `revision`: `number`; `station_city`: `string` \| `null`; `station_company`: `string` \| `null`; `station_country`: `string`; `station_loc`: `string` \| `null`; `station_postcode`: `string` \| `null`; `synced_at`: `string` \| `null`; `updated_at`: `string`; `vehicle_id`: `string`; \} \| `null`\>

Defined in: [api/src/data/fuelLogs.ts:44](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/fuelLogs.ts#L44)

Zapis formularza paliwowego do `fuel_logs`/`adblue_logs` — **idempotentny**.
`id` to UUID wygenerowany na kliencie (PK). Ponowna synchronizacja tego samego
wpisu (outbox offline-first) → `ON CONFLICT (id) DO NOTHING`: brak duplikatu i brak
błędu PK. `maybeSingle`, bo przy konflikcie (DO NOTHING) baza nie zwraca wiersza → `null`.

#### Parameters

##### client

[`TypedSupabaseClient`](../api/api/src.md#typedsupabaseclient)

##### input

###### comment?

`string` = `...`

###### fuelCardId?

`string` = `...`

###### isFull

`boolean` = `...`

Czy zatankowano „do pełna" — do liczenia spalania (full-to-full).

###### liters

`number` = `...`

###### odometerKm

`number` = `...`

###### paymentMethod

`"card"` \| `"cash"` = `...`

###### priceTotal?

`number` = `...`

###### station

\{ `city?`: `string`; `company?`: `string`; `country`: `string`; `lat?`: `number`; `lng?`: `number`; `location?`: `string`; `postcode?`: `string`; \} = `geoLocationSchema`

###### station.city?

`string` = `...`

###### station.company?

`string` = `...`

Nazwa firmy w miejscu (opcjonalnie).

###### station.country

`string` = `...`

###### station.lat?

`number` = `...`

###### station.lng?

`number` = `...`

###### station.location?

`string` = `...`

###### station.postcode?

`string` = `...`

Kod pocztowy (np. wymagany dla UK/Anglii).

###### vehicleId

`string` = `...`

##### ctx

[`FuelLogContext`](../api/api/src.md#fuellogcontext)

##### table?

`"adblue_logs"` \| `"fuel_logs"`

#### Returns

`Promise`\<\{ `comment`: `string` \| `null`; `company_id`: `string`; `created_at`: `string`; `device_id`: `string` \| `null`; `driver_id`: `string`; `fuel_card_id`: `string` \| `null`; `geo`: `unknown`; `id`: `string`; `is_full`: `boolean`; `liters`: `number`; `odometer_km`: `number`; `payment_method`: `"card"` \| `"cash"`; `price_total`: `number` \| `null`; `revision`: `number`; `station_city`: `string` \| `null`; `station_company`: `string` \| `null`; `station_country`: `string`; `station_loc`: `string` \| `null`; `station_postcode`: `string` \| `null`; `synced_at`: `string` \| `null`; `updated_at`: `string`; `vehicle_id`: `string`; \} \| \{ `comment`: `string` \| `null`; `company_id`: `string`; `created_at`: `string`; `device_id`: `string` \| `null`; `driver_id`: `string`; `fuel_card_id`: `string` \| `null`; `geo`: `unknown`; `id`: `string`; `is_full`: `boolean`; `liters`: `number`; `odometer_km`: `number`; `payment_method`: `"card"` \| `"cash"`; `price_total`: `number` \| `null`; `revision`: `number`; `station_city`: `string` \| `null`; `station_company`: `string` \| `null`; `station_country`: `string`; `station_loc`: `string` \| `null`; `station_postcode`: `string` \| `null`; `synced_at`: `string` \| `null`; `updated_at`: `string`; `vehicle_id`: `string`; \} \| `null`\>

***

### insertMapReport()

> **insertMapReport**(`client`, `input`): `Promise`\<\{ `comment`: `string` \| `null`; `id`: `string`; `lat`: `number` \| `null`; `lng`: `number` \| `null`; `type`: `"weigh"` \| `"accident"` \| `"police"` \| `"closure"` \| `"traffic"` \| `"hazard"`; \}\>

Defined in: [api/src/data/mapReports.ts:5](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/mapReports.ts#L5)

#### Parameters

##### client

[`TypedSupabaseClient`](../api/api/src.md#typedsupabaseclient)

##### input

###### comment?

`string` = `...`

###### lat

`number` = `...`

###### lng

`number` = `...`

###### type

`"weigh"` \| `"accident"` \| `"police"` \| `"closure"` \| `"traffic"` \| `"hazard"` = `...`

#### Returns

`Promise`\<\{ `comment`: `string` \| `null`; `id`: `string`; `lat`: `number` \| `null`; `lng`: `number` \| `null`; `type`: `"weigh"` \| `"accident"` \| `"police"` \| `"closure"` \| `"traffic"` \| `"hazard"`; \}\>

***

### insertPerDiemTrip()

> **insertPerDiemTrip**(`client`, `input`, `companyId`): `Promise`\<`string`\>

Defined in: [api/src/data/perDiemTrips.ts:49](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/perDiemTrips.ts#L49)

Dodaje jedną podróż. RLS: owner/dispatcher. Zwraca id.

#### Parameters

##### client

[`TypedSupabaseClient`](../api/api/src.md#typedsupabaseclient)

##### input

[`PerDiemTripInput`](../api/api/src.md#perdiemtripinput)

##### companyId

`string`

#### Returns

`Promise`\<`string`\>

***

### insertSavedPlace()

> **insertSavedPlace**(`client`, `companyId`, `input`): `Promise`\<[`SavedPlace`](../api/api/src.md#savedplace)\>

Defined in: [api/src/data/savedPlaces.ts:36](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/savedPlaces.ts#L36)

Dodaje zapisane miejsce. RLS: aktywny członek. Zwraca wpis.

#### Parameters

##### client

[`TypedSupabaseClient`](../api/api/src.md#typedsupabaseclient)

##### companyId

`string`

##### input

[`SavedPlaceInput`](../api/api/src.md#savedplaceinput)

#### Returns

`Promise`\<[`SavedPlace`](../api/api/src.md#savedplace)\>

***

### insertTachoEvent()

> **insertTachoEvent**(`client`, `input`): `Promise`\<`string`\>

Defined in: [api/src/data/tachoEvents.ts:30](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/tachoEvents.ts#L30)

Zapisuje zdarzenie dziennika (RLS: własny wiersz kierowcy).

#### Parameters

##### client

[`TypedSupabaseClient`](../api/api/src.md#typedsupabaseclient)

##### input

###### at?

`string`

###### companyId

`string`

###### kind

[`TachoEventKind`](../api/api/src.md#tachoeventkind-1)

###### note?

`string` \| `null`

###### restType?

[`TachoRestType`](../api/api/src.md#tachoresttype) \| `null`

#### Returns

`Promise`\<`string`\>

***

### insertTripEvent()

> **insertTripEvent**(`client`, `input`, `ctx`): `Promise`\<\{ `action`: `"other"` \| `"load"` \| `"unload"` \| `"transshipment"` \| `"start"` \| `"end"` \| `"service"`; `amount`: `number` \| `null`; `comment`: `string` \| `null`; `company`: `string` \| `null`; `company_id`: `string`; `country`: `string`; `created_at`: `string`; `device_id`: `string` \| `null`; `driver_id`: `string`; `from_vehicle_reg`: `string` \| `null`; `geo`: `unknown`; `id`: `string`; `location`: `string` \| `null`; `odometer_km`: `number`; `order_id`: `string` \| `null`; `postcode`: `string` \| `null`; `revision`: `number`; `synced_at`: `string` \| `null`; `to_vehicle_reg`: `string` \| `null`; `updated_at`: `string`; `vehicle_id`: `string`; `weight_kg`: `number` \| `null`; \} \| `null`\>

Defined in: [api/src/data/tripEvents.ts:46](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/tripEvents.ts#L46)

Zapis zdarzenia Trip do `trip_events` — **idempotentny** (jak `insertFuelLog`).
`id` to UUID klienta (PK); ponowny sync → `ON CONFLICT (id) DO NOTHING` (bez duplikatu
i bez błędu PK). `maybeSingle`: przy konflikcie baza nie zwraca wiersza → `null`.

#### Parameters

##### client

[`TypedSupabaseClient`](../api/api/src.md#typedsupabaseclient)

##### input

\{ `action`: `"load"`; `comment?`: `string`; `odometerKm`: `number`; `orderId?`: `string`; `place`: \{ `city?`: `string`; `company?`: `string`; `country`: `string`; `lat?`: `number`; `lng?`: `number`; `location?`: `string`; `postcode?`: `string`; \}; `vehicleId`: `string`; `weightKg?`: `number`; \} \| \{ `action`: `"unload"`; `comment?`: `string`; `odometerKm`: `number`; `orderId?`: `string`; `place`: \{ `city?`: `string`; `company?`: `string`; `country`: `string`; `lat?`: `number`; `lng?`: `number`; `location?`: `string`; `postcode?`: `string`; \}; `vehicleId`: `string`; `weightKg?`: `number`; \} \| \{ `action`: `"transshipment"`; `comment?`: `string`; `fromVehicleReg`: `string`; `odometerKm`: `number`; `orderId?`: `string`; `place`: \{ `city?`: `string`; `company?`: `string`; `country`: `string`; `lat?`: `number`; `lng?`: `number`; `location?`: `string`; `postcode?`: `string`; \}; `toVehicleReg`: `string`; `vehicleId`: `string`; `weightKg?`: `number`; \} \| \{ `action`: `"start"`; `comment?`: `string`; `odometerKm`: `number`; `place`: \{ `city?`: `string`; `company?`: `string`; `country`: `string`; `lat?`: `number`; `lng?`: `number`; `location?`: `string`; `postcode?`: `string`; \}; `vehicleId`: `string`; \} \| \{ `action`: `"end"`; `comment?`: `string`; `odometerKm`: `number`; `place`: \{ `city?`: `string`; `company?`: `string`; `country`: `string`; `lat?`: `number`; `lng?`: `number`; `location?`: `string`; `postcode?`: `string`; \}; `vehicleId`: `string`; \} \| \{ `action`: `"service"`; `amount?`: `number`; `comment`: `string`; `odometerKm`: `number`; `place`: \{ `city?`: `string`; `company?`: `string`; `country`: `string`; `lat?`: `number`; `lng?`: `number`; `location?`: `string`; `postcode?`: `string`; \}; `vehicleId`: `string`; \} \| \{ `action`: `"other"`; `amount?`: `number`; `comment`: `string`; `odometerKm`: `number`; `place`: \{ `city?`: `string`; `company?`: `string`; `country`: `string`; `lat?`: `number`; `lng?`: `number`; `location?`: `string`; `postcode?`: `string`; \}; `vehicleId`: `string`; \}

###### Type Literal

\{ `action`: `"load"`; `comment?`: `string`; `odometerKm`: `number`; `orderId?`: `string`; `place`: \{ `city?`: `string`; `company?`: `string`; `country`: `string`; `lat?`: `number`; `lng?`: `number`; `location?`: `string`; `postcode?`: `string`; \}; `vehicleId`: `string`; `weightKg?`: `number`; \}

###### action

`"load"` = `...`

###### comment?

`string` = `...`

###### odometerKm

`number` = `...`

###### orderId?

`string` = `...`

Powiązanie z zleceniem (do auto-zamykania + kosztu transportu).

###### place

\{ `city?`: `string`; `company?`: `string`; `country`: `string`; `lat?`: `number`; `lng?`: `number`; `location?`: `string`; `postcode?`: `string`; \} = `geoLocationSchema`

###### place.city?

`string` = `...`

###### place.company?

`string` = `...`

Nazwa firmy w miejscu (opcjonalnie).

###### place.country

`string` = `...`

###### place.lat?

`number` = `...`

###### place.lng?

`number` = `...`

###### place.location?

`string` = `...`

###### place.postcode?

`string` = `...`

Kod pocztowy (np. wymagany dla UK/Anglii).

###### vehicleId

`string` = `...`

###### weightKg?

`number` = `...`

***

###### Type Literal

\{ `action`: `"transshipment"`; `comment?`: `string`; `fromVehicleReg`: `string`; `odometerKm`: `number`; `orderId?`: `string`; `place`: \{ `city?`: `string`; `company?`: `string`; `country`: `string`; `lat?`: `number`; `lng?`: `number`; `location?`: `string`; `postcode?`: `string`; \}; `toVehicleReg`: `string`; `vehicleId`: `string`; `weightKg?`: `number`; \}

###### action

`"transshipment"` = `...`

###### comment?

`string` = `...`

###### fromVehicleReg

`string` = `...`

Rejestracja auta, Z KTÓREGO przeładowano.

###### odometerKm

`number` = `...`

###### orderId?

`string` = `...`

###### place

\{ `city?`: `string`; `company?`: `string`; `country`: `string`; `lat?`: `number`; `lng?`: `number`; `location?`: `string`; `postcode?`: `string`; \} = `geoLocationSchema`

###### place.city?

`string` = `...`

###### place.company?

`string` = `...`

Nazwa firmy w miejscu (opcjonalnie).

###### place.country

`string` = `...`

###### place.lat?

`number` = `...`

###### place.lng?

`number` = `...`

###### place.location?

`string` = `...`

###### place.postcode?

`string` = `...`

Kod pocztowy (np. wymagany dla UK/Anglii).

###### toVehicleReg

`string` = `...`

Rejestracja auta, NA KTÓRE przeładowano.

###### vehicleId

`string` = `...`

###### weightKg?

`number` = `...`

***

###### Type Literal

\{ `action`: `"service"`; `amount?`: `number`; `comment`: `string`; `odometerKm`: `number`; `place`: \{ `city?`: `string`; `company?`: `string`; `country`: `string`; `lat?`: `number`; `lng?`: `number`; `location?`: `string`; `postcode?`: `string`; \}; `vehicleId`: `string`; \}

###### action

`"service"` = `...`

###### amount?

`number` = `...`

Kwota płatności za serwis — opcjonalna.

###### comment

`string` = `...`

Co zostało naprawione — wymagane.

###### odometerKm

`number` = `...`

###### place

\{ `city?`: `string`; `company?`: `string`; `country`: `string`; `lat?`: `number`; `lng?`: `number`; `location?`: `string`; `postcode?`: `string`; \} = `geoLocationSchema`

###### place.city?

`string` = `...`

###### place.company?

`string` = `...`

Nazwa firmy w miejscu (opcjonalnie).

###### place.country

`string` = `...`

###### place.lat?

`number` = `...`

###### place.lng?

`number` = `...`

###### place.location?

`string` = `...`

###### place.postcode?

`string` = `...`

Kod pocztowy (np. wymagany dla UK/Anglii).

###### vehicleId

`string` = `...`

***

###### Type Literal

\{ `action`: `"other"`; `amount?`: `number`; `comment`: `string`; `odometerKm`: `number`; `place`: \{ `city?`: `string`; `company?`: `string`; `country`: `string`; `lat?`: `number`; `lng?`: `number`; `location?`: `string`; `postcode?`: `string`; \}; `vehicleId`: `string`; \}

###### action

`"other"` = `...`

###### amount?

`number` = `...`

###### comment

`string` = `...`

Opis wykonywanej akcji — wymagany.

###### odometerKm

`number` = `...`

###### place

\{ `city?`: `string`; `company?`: `string`; `country`: `string`; `lat?`: `number`; `lng?`: `number`; `location?`: `string`; `postcode?`: `string`; \} = `geoLocationSchema`

###### place.city?

`string` = `...`

###### place.company?

`string` = `...`

Nazwa firmy w miejscu (opcjonalnie).

###### place.country

`string` = `...`

###### place.lat?

`number` = `...`

###### place.lng?

`number` = `...`

###### place.location?

`string` = `...`

###### place.postcode?

`string` = `...`

Kod pocztowy (np. wymagany dla UK/Anglii).

###### vehicleId

`string` = `...`

##### ctx

[`TripEventContext`](../api/api/src.md#tripeventcontext)

#### Returns

`Promise`\<\{ `action`: `"other"` \| `"load"` \| `"unload"` \| `"transshipment"` \| `"start"` \| `"end"` \| `"service"`; `amount`: `number` \| `null`; `comment`: `string` \| `null`; `company`: `string` \| `null`; `company_id`: `string`; `country`: `string`; `created_at`: `string`; `device_id`: `string` \| `null`; `driver_id`: `string`; `from_vehicle_reg`: `string` \| `null`; `geo`: `unknown`; `id`: `string`; `location`: `string` \| `null`; `odometer_km`: `number`; `order_id`: `string` \| `null`; `postcode`: `string` \| `null`; `revision`: `number`; `synced_at`: `string` \| `null`; `to_vehicle_reg`: `string` \| `null`; `updated_at`: `string`; `vehicle_id`: `string`; `weight_kg`: `number` \| `null`; \} \| `null`\>

***

### insertVehicle()

> **insertVehicle**(`client`, `input`, `companyId`): `Promise`\<\{ `adblue_tank_l`: `number` \| `null`; `comment`: `string` \| `null`; `company_id`: `string`; `created_at`: `string`; `curb_weight_kg`: `number` \| `null`; `first_registration_date`: `string` \| `null`; `forwarder`: `string` \| `null`; `fuel_tank_l`: `number` \| `null`; `height_cm`: `number` \| `null`; `id`: `string`; `inspection_expiry`: `string` \| `null`; `insurance_expiry`: `string` \| `null`; `insurer`: `string` \| `null`; `leasing_end`: `string` \| `null`; `length_cm`: `number` \| `null`; `license_expiry`: `string` \| `null`; `license_number`: `string` \| `null`; `make`: `string` \| `null`; `max_payload_kg`: `number` \| `null`; `model`: `string`; `registration`: `string`; `trailer_registration`: `string` \| `null`; `trailer_type`: `string` \| `null`; `updated_at`: `string`; `vehicle_type`: `"other"` \| `"truck"` \| `"tractor"` \| `"van"` \| `"trailer"`; `vin`: `string` \| `null`; `width_cm`: `number` \| `null`; `year`: `number` \| `null`; \}\>

Defined in: [api/src/data/vehicles.ts:66](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/vehicles.ts#L66)

#### Parameters

##### client

[`TypedSupabaseClient`](../api/api/src.md#typedsupabaseclient)

##### input

###### adblueTankL?

`number` = `...`

###### comment?

`string` = `...`

###### curbWeightKg?

`number` = `...`

###### firstRegistrationDate?

`string` = `...`

###### forwarder?

`string` = `...`

###### fuelTankL?

`number` = `...`

###### heightCm?

`number` = `...`

###### inspectionExpiry?

`string` = `...`

###### insuranceExpiry?

`string` = `...`

###### insurer?

`string` = `...`

###### leasingEnd?

`string` = `...`

###### lengthCm?

`number` = `...`

###### licenseExpiry?

`string` = `...`

###### licenseNumber?

`string` = `...`

###### make?

`string` = `...`

###### maxPayloadKg?

`number` = `...`

###### model

`string` = `...`

###### registration

`string` = `...`

###### trailerRegistration?

`string` = `...`

Naczepa (jeśli auto ją posiada — #250): rejestracja + typ. Opcjonalne.

###### trailerType?

`string` = `...`

###### vehicleType

`"other"` \| `"truck"` \| `"tractor"` \| `"van"` \| `"trailer"` = `...`

###### vin?

`string` = `...`

VIN: 17 znaków, bez I/O/Q (norma ISO 3779). Walidowany tylko gdy podany.

###### widthCm?

`number` = `...`

###### year

`number` = `...`

##### companyId

`string`

#### Returns

`Promise`\<\{ `adblue_tank_l`: `number` \| `null`; `comment`: `string` \| `null`; `company_id`: `string`; `created_at`: `string`; `curb_weight_kg`: `number` \| `null`; `first_registration_date`: `string` \| `null`; `forwarder`: `string` \| `null`; `fuel_tank_l`: `number` \| `null`; `height_cm`: `number` \| `null`; `id`: `string`; `inspection_expiry`: `string` \| `null`; `insurance_expiry`: `string` \| `null`; `insurer`: `string` \| `null`; `leasing_end`: `string` \| `null`; `length_cm`: `number` \| `null`; `license_expiry`: `string` \| `null`; `license_number`: `string` \| `null`; `make`: `string` \| `null`; `max_payload_kg`: `number` \| `null`; `model`: `string`; `registration`: `string`; `trailer_registration`: `string` \| `null`; `trailer_type`: `string` \| `null`; `updated_at`: `string`; `vehicle_type`: `"other"` \| `"truck"` \| `"tractor"` \| `"van"` \| `"trailer"`; `vin`: `string` \| `null`; `width_cm`: `number` \| `null`; `year`: `number` \| `null`; \}\>

***

### insertVehicleCost()

> **insertVehicleCost**(`client`, `input`, `companyId`): `Promise`\<`string`\>

Defined in: [api/src/data/vehicleCosts.ts:33](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/vehicleCosts.ts#L33)

Dodaje koszt pojazdu. RLS: owner/dispatcher. Zwraca id.

#### Parameters

##### client

[`TypedSupabaseClient`](../api/api/src.md#typedsupabaseclient)

##### input

###### amount

`number` = `...`

###### category

`"other"` \| `"parking"` \| `"repair"` \| `"leasing"` \| `"insurance"` \| `"tax"` \| `"fine"` \| `"tires"` = `...`

###### costDate

`string` = `isoDate`

###### currency

`string` = `...`

###### description?

`string` = `...`

###### vehicleId

`string` = `...`

##### companyId

`string`

#### Returns

`Promise`\<`string`\>

***

### insertWorkTimeEntry()

> **insertWorkTimeEntry**(`client`, `input`, `companyId`): `Promise`\<`string`\>

Defined in: [api/src/data/workTimeEntries.ts:43](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/workTimeEntries.ts#L43)

Dodaje jeden dzień pracy. RLS: owner/dispatcher. Zwraca id.

#### Parameters

##### client

[`TypedSupabaseClient`](../api/api/src.md#typedsupabaseclient)

##### input

[`WorkTimeInput`](../api/api/src.md#worktimeinput)

##### companyId

`string`

#### Returns

`Promise`\<`string`\>

***

### latestOdometers()

> **latestOdometers**(`client`, `companyId`): `Promise`\<`Record`\<`string`, `number`\>\>

Defined in: [api/src/data/service.ts:42](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/service.ts#L42)

Bieżący przebieg per pojazd = max licznika z tankowań. RLS zawęża do firmy.

#### Parameters

##### client

[`TypedSupabaseClient`](../api/api/src.md#typedsupabaseclient)

##### companyId

`string`

#### Returns

`Promise`\<`Record`\<`string`, `number`\>\>

***

### linkDriverUser()

> **linkDriverUser**(`client`, `driverId`, `companyId`, `userId`): `Promise`\<`void`\>

Defined in: [api/src/data/drivers.ts:110](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/drivers.ts#L110)

Powiązuje kartotekę kierowcy z kontem aplikacji (lub odłącza: userId = null). RPC, owner/dispatcher.

#### Parameters

##### client

[`TypedSupabaseClient`](../api/api/src.md#typedsupabaseclient)

##### driverId

`string`

##### companyId

`string`

##### userId

`string` \| `null`

#### Returns

`Promise`\<`void`\>

***

### listActiveMapReports()

> **listActiveMapReports**(`client`): `Promise`\<`object`[]\>

Defined in: [api/src/data/mapReports.ts:30](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/mapReports.ts#L30)

Aktywne (niewygasłe) zgłoszenia z współrzędnymi.

#### Parameters

##### client

[`TypedSupabaseClient`](../api/api/src.md#typedsupabaseclient)

#### Returns

`Promise`\<`object`[]\>

***

### listAuditLog()

> **listAuditLog**(`client`, `companyId`, `opts?`): `Promise`\<[`AuditEntry`](../api/api/src.md#auditentry)[]\>

Defined in: [api/src/data/audit.ts:18](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/audit.ts#L18)

Wpisy audytu firmy (najnowsze pierwsze). RLS: tylko owner/developer (`audit_log_select`).
Filtr po `action`; `limit` ogranicza transfer (domyślnie 200).

#### Parameters

##### client

[`TypedSupabaseClient`](../api/api/src.md#typedsupabaseclient)

##### companyId

`string`

##### opts?

###### action?

`string`

###### limit?

`number`

#### Returns

`Promise`\<[`AuditEntry`](../api/api/src.md#auditentry)[]\>

***

### listChecklistSubmissions()

> **listChecklistSubmissions**(`client`, `companyId`, `opts?`): `Promise`\<[`ChecklistSubmission`](../api/api/src.md#checklistsubmission)[]\>

Defined in: [api/src/data/checklists.ts:143](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/checklists.ts#L143)

Zgłoszenia firmy (zarząd) lub własne (kierowca — RLS zawęża). Filtry + sort.

#### Parameters

##### client

[`TypedSupabaseClient`](../api/api/src.md#typedsupabaseclient)

##### companyId

`string`

##### opts?

###### driverUserId?

`string`

###### limit?

`number`

###### templateName?

`string`

###### vehicleId?

`string`

#### Returns

`Promise`\<[`ChecklistSubmission`](../api/api/src.md#checklistsubmission)[]\>

***

### listChecklistTemplates()

> **listChecklistTemplates**(`client`, `companyId`, `opts?`): `Promise`\<[`ChecklistTemplate`](../api/api/src.md#checklisttemplate)[]\>

Defined in: [api/src/data/checklists.ts:25](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/checklists.ts#L25)

Szablony firmy (aktywne pierwsze). RLS: każdy członek czyta.

#### Parameters

##### client

[`TypedSupabaseClient`](../api/api/src.md#typedsupabaseclient)

##### companyId

`string`

##### opts?

###### activeOnly?

`boolean`

#### Returns

`Promise`\<[`ChecklistTemplate`](../api/api/src.md#checklisttemplate)[]\>

***

### listCompanyMembers()

> **listCompanyMembers**(`client`): `Promise`\<[`CompanyMember`](../api/api/src.md#companymember)[]\>

Defined in: [api/src/data/memberships.ts:51](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/memberships.ts#L51)

Lista członków firmy (RPC, owner/dispatcher).

#### Parameters

##### client

[`TypedSupabaseClient`](../api/api/src.md#typedsupabaseclient)

#### Returns

`Promise`\<[`CompanyMember`](../api/api/src.md#companymember)[]\>

***

### listContractors()

> **listContractors**(`client`, `companyId`): `Promise`\<[`Contractor`](../api/api/src.md#contractor)[]\>

Defined in: [api/src/data/contractors.ts:15](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/contractors.ts#L15)

Kontrahenci firmy (alfabetycznie). RLS: członek czyta.

#### Parameters

##### client

[`TypedSupabaseClient`](../api/api/src.md#typedsupabaseclient)

##### companyId

`string`

#### Returns

`Promise`\<[`Contractor`](../api/api/src.md#contractor)[]\>

***

### listDamageClaims()

> **listDamageClaims**(`client`, `companyId`, `opts?`): `Promise`\<[`DamageClaim`](../api/api/src.md#damageclaim)[]\>

Defined in: [api/src/data/damageClaims.ts:39](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/damageClaims.ts#L39)

Szkody firmy (wg daty malejąco). RLS: członek czyta.

#### Parameters

##### client

[`TypedSupabaseClient`](../api/api/src.md#typedsupabaseclient)

##### companyId

`string`

##### opts?

###### limit?

`number`

#### Returns

`Promise`\<[`DamageClaim`](../api/api/src.md#damageclaim)[]\>

***

### listDamagePhotos()

> **listDamagePhotos**(`client`, `companyId`, `claimId`): `Promise`\<[`DamagePhoto`](../api/api/src.md#damagephoto)[]\>

Defined in: [api/src/data/damagePhotos.ts:19](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/damagePhotos.ts#L19)

Lista zdjęć szkody z podpisanymi URL-ami (bucket prywatny, 10 min).

#### Parameters

##### client

[`TypedSupabaseClient`](../api/api/src.md#typedsupabaseclient)

##### companyId

`string`

##### claimId

`string`

#### Returns

`Promise`\<[`DamagePhoto`](../api/api/src.md#damagephoto)[]\>

***

### listDefects()

> **listDefects**(`client`, `opts?`): `Promise`\<`object`[]\>

Defined in: [api/src/data/defects.ts:5](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/defects.ts#L5)

#### Parameters

##### client

[`TypedSupabaseClient`](../api/api/src.md#typedsupabaseclient)

##### opts?

###### limit?

`number`

###### vehicleId?

`string`

#### Returns

`Promise`\<`object`[]\>

***

### listDocuments()

> **listDocuments**(`client`, `companyId`): `Promise`\<[`DocumentMeta`](../api/api/src.md#documentmeta)[]\>

Defined in: [api/src/data/documents.ts:35](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/documents.ts#L35)

#### Parameters

##### client

[`TypedSupabaseClient`](../api/api/src.md#typedsupabaseclient)

##### companyId

`string`

#### Returns

`Promise`\<[`DocumentMeta`](../api/api/src.md#documentmeta)[]\>

***

### listDriverExpenses()

> **listDriverExpenses**(`client`, `opts?`): `Promise`\<[`DriverExpense`](../api/api/src.md#driverexpense)[]\>

Defined in: [api/src/data/driverExpenses.ts:50](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/driverExpenses.ts#L50)

Wydatki (RLS: kierowca swoje, zarząd całą firmę). Filtr statusu opcjonalny.

#### Parameters

##### client

[`TypedSupabaseClient`](../api/api/src.md#typedsupabaseclient)

##### opts?

###### limit?

`number`

###### status?

[`ExpenseStatus`](../api/api/src.md#expensestatus)

#### Returns

`Promise`\<[`DriverExpense`](../api/api/src.md#driverexpense)[]\>

***

### listDriverPayouts()

> **listDriverPayouts**(`client`, `companyId`, `opts?`): `Promise`\<[`DriverPayoutRecord`](../api/api/src.md#driverpayoutrecord)[]\>

Defined in: [api/src/data/driverPayouts.ts:30](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/driverPayouts.ts#L30)

Pozycje rozliczeń firmy (wg daty malejąco). Filtr: kierowca. RLS: członek czyta.

#### Parameters

##### client

[`TypedSupabaseClient`](../api/api/src.md#typedsupabaseclient)

##### companyId

`string`

##### opts?

###### driverName?

`string`

###### limit?

`number`

#### Returns

`Promise`\<[`DriverPayoutRecord`](../api/api/src.md#driverpayoutrecord)[]\>

***

### listDriverPositions()

> **listDriverPositions**(`client`, `companyId`): `Promise`\<[`DriverPosition`](../api/api/src.md#driverposition)[]\>

Defined in: [api/src/data/positions.ts:59](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/positions.ts#L59)

Aktualne pozycje kierowców firmy (RLS: członek czyta).

#### Parameters

##### client

[`TypedSupabaseClient`](../api/api/src.md#typedsupabaseclient)

##### companyId

`string`

#### Returns

`Promise`\<[`DriverPosition`](../api/api/src.md#driverposition)[]\>

***

### listDrivers()

> **listDrivers**(`client`, `companyId`): `Promise`\<[`DriverRow`](../api/api/src.md#driverrow)[]\>

Defined in: [api/src/data/drivers.ts:30](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/drivers.ts#L30)

Lista kierowców — tożsamość (imię/nazwisko/data ur.) jest szyfrowana at-rest,
więc odczyt idzie przez RPC `list_drivers` (deszyfrowanie, owner/dispatcher).

#### Parameters

##### client

[`TypedSupabaseClient`](../api/api/src.md#typedsupabaseclient)

##### companyId

`string`

#### Returns

`Promise`\<[`DriverRow`](../api/api/src.md#driverrow)[]\>

***

### listExpoPushTokensForUsers()

> **listExpoPushTokensForUsers**(`client`, `userIds`): `Promise`\<`string`[]\>

Defined in: [api/src/data/expoPush.ts:41](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/expoPush.ts#L41)

Tokeny Expo wskazanych użytkowników — do wysyłki serwerowej (klient service-role
omija RLS). Pusta lista użytkowników → pusto.

#### Parameters

##### client

[`TypedSupabaseClient`](../api/api/src.md#typedsupabaseclient)

##### userIds

`string`[]

#### Returns

`Promise`\<`string`[]\>

***

### listFuelCardsByVehicle()

> **listFuelCardsByVehicle**(`client`, `vehicleId`): `Promise`\<`object`[]\>

Defined in: [api/src/data/fuelCards.ts:30](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/fuelCards.ts#L30)

Karty przypisane do danego pojazdu (do panelu pojazdu).

#### Parameters

##### client

[`TypedSupabaseClient`](../api/api/src.md#typedsupabaseclient)

##### vehicleId

`string`

#### Returns

`Promise`\<`object`[]\>

***

### listFuelCardsForUser()

> **listFuelCardsForUser**(`client`): `Promise`\<`object`[]\>

Defined in: [api/src/data/fuelCards.ts:23](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/fuelCards.ts#L23)

Karty widoczne dla bieżącego użytkownika (RPC, RLS-aware):
owner/dispatcher → wszystkie karty firmy z rabatem; kierowca → tylko karty
przypisanego auta, BEZ rabatu (`discount_percent = null`).

#### Parameters

##### client

[`TypedSupabaseClient`](../api/api/src.md#typedsupabaseclient)

#### Returns

`Promise`\<`object`[]\>

***

### listFuelCardsSafe()

> **listFuelCardsSafe**(`client`, `companyId`): `Promise`\<`object`[]\>

Defined in: [api/src/data/fuelCards.ts:6](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/fuelCards.ts#L6)

Lista kart bez danych wrażliwych (PIN poza wynikiem — tylko przez `getFuelCardPin`).

#### Parameters

##### client

[`TypedSupabaseClient`](../api/api/src.md#typedsupabaseclient)

##### companyId

`string`

#### Returns

`Promise`\<`object`[]\>

***

### listFuelLogs()

> **listFuelLogs**(`client`, `opts?`): `Promise`\<(\{ `comment`: `string` \| `null`; `company_id`: `string`; `created_at`: `string`; `device_id`: `string` \| `null`; `driver_id`: `string`; `fuel_card_id`: `string` \| `null`; `geo`: `unknown`; `id`: `string`; `is_full`: `boolean`; `liters`: `number`; `odometer_km`: `number`; `payment_method`: `"card"` \| `"cash"`; `price_total`: `number` \| `null`; `revision`: `number`; `station_city`: `string` \| `null`; `station_company`: `string` \| `null`; `station_country`: `string`; `station_loc`: `string` \| `null`; `station_postcode`: `string` \| `null`; `synced_at`: `string` \| `null`; `updated_at`: `string`; `vehicle_id`: `string`; \} \| \{ `comment`: `string` \| `null`; `company_id`: `string`; `created_at`: `string`; `device_id`: `string` \| `null`; `driver_id`: `string`; `fuel_card_id`: `string` \| `null`; `geo`: `unknown`; `id`: `string`; `is_full`: `boolean`; `liters`: `number`; `odometer_km`: `number`; `payment_method`: `"card"` \| `"cash"`; `price_total`: `number` \| `null`; `revision`: `number`; `station_city`: `string` \| `null`; `station_company`: `string` \| `null`; `station_country`: `string`; `station_loc`: `string` \| `null`; `station_postcode`: `string` \| `null`; `synced_at`: `string` \| `null`; `updated_at`: `string`; `vehicle_id`: `string`; \})[]\>

Defined in: [api/src/data/fuelLogs.ts:90](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/fuelLogs.ts#L90)

Lista formularzy paliwowych (RLS zawęża do kierowcy/firmy).
Filtry `from`/`to` (zakres `created_at`, ISO) i `limit` ograniczają transfer —
statystyki/rozliczenia/historia nie ładują całej tabeli do pamięci.

#### Parameters

##### client

[`TypedSupabaseClient`](../api/api/src.md#typedsupabaseclient)

##### opts?

###### from?

`string`

###### limit?

`number`

###### table?

`"adblue_logs"` \| `"fuel_logs"`

###### to?

`string`

###### vehicleId?

`string`

#### Returns

`Promise`\<(\{ `comment`: `string` \| `null`; `company_id`: `string`; `created_at`: `string`; `device_id`: `string` \| `null`; `driver_id`: `string`; `fuel_card_id`: `string` \| `null`; `geo`: `unknown`; `id`: `string`; `is_full`: `boolean`; `liters`: `number`; `odometer_km`: `number`; `payment_method`: `"card"` \| `"cash"`; `price_total`: `number` \| `null`; `revision`: `number`; `station_city`: `string` \| `null`; `station_company`: `string` \| `null`; `station_country`: `string`; `station_loc`: `string` \| `null`; `station_postcode`: `string` \| `null`; `synced_at`: `string` \| `null`; `updated_at`: `string`; `vehicle_id`: `string`; \} \| \{ `comment`: `string` \| `null`; `company_id`: `string`; `created_at`: `string`; `device_id`: `string` \| `null`; `driver_id`: `string`; `fuel_card_id`: `string` \| `null`; `geo`: `unknown`; `id`: `string`; `is_full`: `boolean`; `liters`: `number`; `odometer_km`: `number`; `payment_method`: `"card"` \| `"cash"`; `price_total`: `number` \| `null`; `revision`: `number`; `station_city`: `string` \| `null`; `station_company`: `string` \| `null`; `station_country`: `string`; `station_loc`: `string` \| `null`; `station_postcode`: `string` \| `null`; `synced_at`: `string` \| `null`; `updated_at`: `string`; `vehicle_id`: `string`; \})[]\>

***

### listInvoiceItems()

> **listInvoiceItems**(`client`, `invoiceId`): `Promise`\<[`InvoiceItem`](../api/api/src.md#invoiceitem)[]\>

Defined in: [api/src/data/invoices.ts:142](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/invoices.ts#L142)

#### Parameters

##### client

[`TypedSupabaseClient`](../api/api/src.md#typedsupabaseclient)

##### invoiceId

`string`

#### Returns

`Promise`\<[`InvoiceItem`](../api/api/src.md#invoiceitem)[]\>

***

### listInvoices()

> **listInvoices**(`client`, `companyId`, `opts?`): `Promise`\<[`Invoice`](../api/api/src.md#invoice)[]\>

Defined in: [api/src/data/invoices.ts:37](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/invoices.ts#L37)

Faktury firmy (najnowsze pierwsze). `opts` ogranicza zakres: `from`/`to` po
`created_at`, `limit` zabezpiecza przed pobraniem całej historii.

#### Parameters

##### client

[`TypedSupabaseClient`](../api/api/src.md#typedsupabaseclient)

##### companyId

`string`

##### opts?

###### from?

`string`

###### limit?

`number`

###### to?

`string`

#### Returns

`Promise`\<[`Invoice`](../api/api/src.md#invoice)[]\>

***

### listMessages()

> **listMessages**(`client`, `companyId`, `opts?`): `Promise`\<[`ChatMessage`](../api/api/src.md#chatmessage)[]\>

Defined in: [api/src/data/messages.ts:31](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/messages.ts#L31)

Wiadomości kanału (threadId null = kanał ogólny). Rosnąco, gotowe do renderu.

#### Parameters

##### client

[`TypedSupabaseClient`](../api/api/src.md#typedsupabaseclient)

##### companyId

`string`

##### opts?

###### limit?

`number`

###### threadId?

`string` \| `null`

#### Returns

`Promise`\<[`ChatMessage`](../api/api/src.md#chatmessage)[]\>

***

### listMyDriverRoutes()

> **listMyDriverRoutes**(`client`, `limit?`): `Promise`\<[`DriverRoute`](../api/api/src.md#driverroute)[]\>

Defined in: [api/src/data/driverRoutes.ts:53](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/driverRoutes.ts#L53)

Trasy zalogowanego kierowcy (mobile) — najnowsze pierwsze. RLS: driver_user_id.

#### Parameters

##### client

[`TypedSupabaseClient`](../api/api/src.md#typedsupabaseclient)

##### limit?

`number` = `10`

#### Returns

`Promise`\<[`DriverRoute`](../api/api/src.md#driverroute)[]\>

***

### listMyOrders()

> **listMyOrders**(`client`): `Promise`\<[`Order`](../api/api/src.md#order)[]\>

Defined in: [api/src/data/orders.ts:51](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/orders.ts#L51)

Zlecenia przypisane do bieżącego użytkownika (kierowcy). RLS dopuszcza odczyt członka.

#### Parameters

##### client

[`TypedSupabaseClient`](../api/api/src.md#typedsupabaseclient)

#### Returns

`Promise`\<[`Order`](../api/api/src.md#order)[]\>

***

### listMyTachoEvents()

> **listMyTachoEvents**(`client`, `opts?`): `Promise`\<[`TachoEvent`](../api/api/src.md#tachoevent)[]\>

Defined in: [api/src/data/tachoEvents.ts:61](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/tachoEvents.ts#L61)

Dziennik zalogowanego kierowcy (najnowsze pierwsze).

#### Parameters

##### client

[`TypedSupabaseClient`](../api/api/src.md#typedsupabaseclient)

##### opts?

###### from?

`string`

###### limit?

`number`

#### Returns

`Promise`\<[`TachoEvent`](../api/api/src.md#tachoevent)[]\>

***

### listMyTripEvents()

> **listMyTripEvents**(`client`, `opts?`): `Promise`\<`object`[]\>

Defined in: [api/src/data/tripEvents.ts:95](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/tripEvents.ts#L95)

#314: zdarzenia Trip zalogowanego kierowcy (RLS ogranicza do własnych wpisów).

#### Parameters

##### client

[`TypedSupabaseClient`](../api/api/src.md#typedsupabaseclient)

##### opts?

###### from?

`string`

###### limit?

`number`

#### Returns

`Promise`\<`object`[]\>

***

### listNotifications()

> **listNotifications**(`client`, `limit?`): `Promise`\<[`Notification`](../api/api/src.md#notification)[]\>

Defined in: [api/src/data/notifications.ts:15](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/notifications.ts#L15)

Ostatnie powiadomienia zalogowanego użytkownika.

#### Parameters

##### client

[`TypedSupabaseClient`](../api/api/src.md#typedsupabaseclient)

##### limit?

`number` = `30`

#### Returns

`Promise`\<[`Notification`](../api/api/src.md#notification)[]\>

***

### listOrderPhotos()

> **listOrderPhotos**(`client`, `orderId`): `Promise`\<[`OrderPhoto`](../api/api/src.md#orderphoto)[]\>

Defined in: [api/src/data/orderPhotos.ts:21](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/orderPhotos.ts#L21)

Zdjęcia danego zlecenia (najnowsze pierwsze). RLS: członek czyta.

#### Parameters

##### client

[`TypedSupabaseClient`](../api/api/src.md#typedsupabaseclient)

##### orderId

`string`

#### Returns

`Promise`\<[`OrderPhoto`](../api/api/src.md#orderphoto)[]\>

***

### listOrders()

> **listOrders**(`client`, `companyId`, `opts?`): `Promise`\<[`Order`](../api/api/src.md#order)[]\>

Defined in: [api/src/data/orders.ts:32](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/orders.ts#L32)

Zlecenia firmy (najnowsze pierwsze). `opts` ogranicza zakres dla stron analitycznych:
`from`/`to` filtrują po `created_at`, `limit` zabezpiecza przed pobraniem całej historii.

#### Parameters

##### client

[`TypedSupabaseClient`](../api/api/src.md#typedsupabaseclient)

##### companyId

`string`

##### opts?

###### from?

`string`

###### limit?

`number`

###### to?

`string`

#### Returns

`Promise`\<[`Order`](../api/api/src.md#order)[]\>

***

### listParkingReviews()

> **listParkingReviews**(`sb`, `poiId`): `Promise`\<[`ParkingReview`](../api/api/src.md#parkingreview)[]\>

Defined in: [api/src/data/parkingReviews.ts:48](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/parkingReviews.ts#L48)

Oceny jednego parkingu (najnowsze pierwsze).

#### Parameters

##### sb

`DB`

##### poiId

`string`

#### Returns

`Promise`\<[`ParkingReview`](../api/api/src.md#parkingreview)[]\>

***

### listPerDiemTrips()

> **listPerDiemTrips**(`client`, `companyId`, `opts?`): `Promise`\<[`PerDiemTrip`](../api/api/src.md#perdiemtrip)[]\>

Defined in: [api/src/data/perDiemTrips.ts:35](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/perDiemTrips.ts#L35)

Zapisane podróże firmy (najnowsze pierwsze). Filtr: kierowca. RLS: członek czyta.

#### Parameters

##### client

[`TypedSupabaseClient`](../api/api/src.md#typedsupabaseclient)

##### companyId

`string`

##### opts?

###### driverName?

`string`

###### limit?

`number`

#### Returns

`Promise`\<[`PerDiemTrip`](../api/api/src.md#perdiemtrip)[]\>

***

### listPushSubscriptionsForDelivery()

> **listPushSubscriptionsForDelivery**(`admin`, `opts?`): `Promise`\<[`StoredPushSubscription`](../api/api/src.md#storedpushsubscription)[]\>

Defined in: [api/src/data/push.ts:51](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/push.ts#L51)

Subskrypcje do wysyłki (TYLKO serwer / service-role — omija RLS).
Filtruje po firmie i/lub konkretnych użytkownikach.

GUARD anty-wyciek (audyt/QA): wymaga ≥1 efektywnego filtra (`companyId` lub
niepusty `userIds`). Bez filtra zapytanie service-role zwróciłoby subskrypcje
WSZYSTKICH firm (cross-tenant) — dlatego twardo rzucamy, zamiast polegać na
konwencji wołających. Świadomy broadcast należy zaimplementować osobno/jawnie.

#### Parameters

##### admin

[`TypedSupabaseClient`](../api/api/src.md#typedsupabaseclient)

##### opts?

###### companyId?

`string`

###### userIds?

`string`[]

#### Returns

`Promise`\<[`StoredPushSubscription`](../api/api/src.md#storedpushsubscription)[]\>

***

### listRates()

> **listRates**(`client`, `companyId`): `Promise`\<[`Rate`](../api/api/src.md#rate)[]\>

Defined in: [api/src/data/rates.ts:23](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/rates.ts#L23)

Stawki firmy (najnowsze pierwsze). RLS: członek czyta.

#### Parameters

##### client

[`TypedSupabaseClient`](../api/api/src.md#typedsupabaseclient)

##### companyId

`string`

#### Returns

`Promise`\<[`Rate`](../api/api/src.md#rate)[]\>

***

### listRecentAudit()

> **listRecentAudit**(`client`, `limit?`): `Promise`\<`object`[]\>

Defined in: [api/src/data/dev.ts:14](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/dev.ts#L14)

Ostatnie wpisy audytu (RLS: owner/developer).

#### Parameters

##### client

[`TypedSupabaseClient`](../api/api/src.md#typedsupabaseclient)

##### limit?

`number` = `25`

#### Returns

`Promise`\<`object`[]\>

***

### listSavedPlaces()

> **listSavedPlaces**(`client`, `companyId`): `Promise`\<[`SavedPlace`](../api/api/src.md#savedplace)[]\>

Defined in: [api/src/data/savedPlaces.ts:22](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/savedPlaces.ts#L22)

Zapisane miejsca firmy (alfabetycznie). RLS: członek czyta.

#### Parameters

##### client

[`TypedSupabaseClient`](../api/api/src.md#typedsupabaseclient)

##### companyId

`string`

#### Returns

`Promise`\<[`SavedPlace`](../api/api/src.md#savedplace)[]\>

***

### listServiceTasks()

> **listServiceTasks**(`client`, `companyId`): `Promise`\<[`ServiceTask`](../api/api/src.md#servicetask)[]\>

Defined in: [api/src/data/service.ts:28](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/service.ts#L28)

#### Parameters

##### client

[`TypedSupabaseClient`](../api/api/src.md#typedsupabaseclient)

##### companyId

`string`

#### Returns

`Promise`\<[`ServiceTask`](../api/api/src.md#servicetask)[]\>

***

### listThreadMembers()

> **listThreadMembers**(`client`, `threadId`): `Promise`\<`string`[]\>

Defined in: [api/src/data/messages.ts:150](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/messages.ts#L150)

Identyfikatory członków kanału.

#### Parameters

##### client

[`TypedSupabaseClient`](../api/api/src.md#typedsupabaseclient)

##### threadId

`string`

#### Returns

`Promise`\<`string`[]\>

***

### listThreads()

> **listThreads**(`client`, `companyId`): `Promise`\<[`ChatThread`](../api/api/src.md#chatthread)[]\>

Defined in: [api/src/data/messages.ts:98](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/messages.ts#L98)

Wątki widoczne dla zalogowanego (RLS: zarząd wszystkie, kierowca swoje).

#### Parameters

##### client

[`TypedSupabaseClient`](../api/api/src.md#typedsupabaseclient)

##### companyId

`string`

#### Returns

`Promise`\<[`ChatThread`](../api/api/src.md#chatthread)[]\>

***

### listTripEvents()

> **listTripEvents**(`client`, `opts?`): `Promise`\<`object`[]\>

Defined in: [api/src/data/tripEvents.ts:80](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/tripEvents.ts#L80)

Lista zdarzeń Trip (RLS zawęża do kierowcy/firmy).
Filtry `from`/`to` (zakres `created_at`, ISO) i `limit` ograniczają transfer.

#### Parameters

##### client

[`TypedSupabaseClient`](../api/api/src.md#typedsupabaseclient)

##### opts?

###### from?

`string`

###### limit?

`number`

###### to?

`string`

###### vehicleId?

`string`

#### Returns

`Promise`\<`object`[]\>

***

### listVehicleCosts()

> **listVehicleCosts**(`client`, `companyId`, `opts?`): `Promise`\<[`VehicleCost`](../api/api/src.md#vehiclecost)[]\>

Defined in: [api/src/data/vehicleCosts.ts:18](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/vehicleCosts.ts#L18)

Koszty firmy (najnowsze pierwsze). Filtry: pojazd, data od. RLS: członek czyta.

#### Parameters

##### client

[`TypedSupabaseClient`](../api/api/src.md#typedsupabaseclient)

##### companyId

`string`

##### opts?

###### from?

`string`

###### limit?

`number`

###### vehicleId?

`string`

#### Returns

`Promise`\<[`VehicleCost`](../api/api/src.md#vehiclecost)[]\>

***

### listVehicles()

> **listVehicles**(`client`, `companyId`): `Promise`\<`object`[]\>

Defined in: [api/src/data/vehicles.ts:5](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/vehicles.ts#L5)

#### Parameters

##### client

[`TypedSupabaseClient`](../api/api/src.md#typedsupabaseclient)

##### companyId

`string`

#### Returns

`Promise`\<`object`[]\>

***

### listVehiclesExpiry()

> **listVehiclesExpiry**(`client`, `companyId`): `Promise`\<`object`[]\>

Defined in: [api/src/data/vehicles.ts:18](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/vehicles.ts#L18)

Pojazdy z datami ważności (przegląd/OC/leasing) — do przypomnień.

#### Parameters

##### client

[`TypedSupabaseClient`](../api/api/src.md#typedsupabaseclient)

##### companyId

`string`

#### Returns

`Promise`\<`object`[]\>

***

### listVisibleChecklistTemplates()

> **listVisibleChecklistTemplates**(`client`): `Promise`\<[`ChecklistTemplate`](../api/api/src.md#checklisttemplate)[]\>

Defined in: [api/src/data/checklists.ts:51](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/checklists.ts#L51)

#338: szablony WIDOCZNE dla zalogowanego kierowcy (tylko aktywne i
przypisane do niego lub dla wszystkich). RPC security definer.

#### Parameters

##### client

[`TypedSupabaseClient`](../api/api/src.md#typedsupabaseclient)

#### Returns

`Promise`\<[`ChecklistTemplate`](../api/api/src.md#checklisttemplate)[]\>

***

### listWorkTimeEntries()

> **listWorkTimeEntries**(`client`, `companyId`, `opts?`): `Promise`\<[`WorkTimeRecord`](../api/api/src.md#worktimerecord)[]\>

Defined in: [api/src/data/workTimeEntries.ts:29](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/workTimeEntries.ts#L29)

Wpisy czasu pracy firmy (wg daty malejąco). Filtr: kierowca. RLS: członek czyta.

#### Parameters

##### client

[`TypedSupabaseClient`](../api/api/src.md#typedsupabaseclient)

##### companyId

`string`

##### opts?

###### driverName?

`string`

###### limit?

`number`

#### Returns

`Promise`\<[`WorkTimeRecord`](../api/api/src.md#worktimerecord)[]\>

***

### markNotificationRead()

> **markNotificationRead**(`client`, `id`): `Promise`\<`void`\>

Defined in: [api/src/data/notifications.ts:35](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/notifications.ts#L35)

Oznacza pojedyncze powiadomienie jako przeczytane.

#### Parameters

##### client

[`TypedSupabaseClient`](../api/api/src.md#typedsupabaseclient)

##### id

`string`

#### Returns

`Promise`\<`void`\>

***

### markNotificationsRead()

> **markNotificationsRead**(`client`): `Promise`\<`void`\>

Defined in: [api/src/data/notifications.ts:26](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/notifications.ts#L26)

Oznacza wszystkie nieprzeczytane jako przeczytane.

#### Parameters

##### client

[`TypedSupabaseClient`](../api/api/src.md#typedsupabaseclient)

#### Returns

`Promise`\<`void`\>

***

### markServiceDone()

> **markServiceDone**(`client`, `id`, `doneKm`, `doneDate`): `Promise`\<`void`\>

Defined in: [api/src/data/service.ts:85](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/service.ts#L85)

#### Parameters

##### client

[`TypedSupabaseClient`](../api/api/src.md#typedsupabaseclient)

##### id

`string`

##### doneKm

`number` \| `null`

##### doneDate

`string`

#### Returns

`Promise`\<`void`\>

***

### notifyCompany()

> **notifyCompany**(`client`, `p`): `Promise`\<`void`\>

Defined in: [api/src/data/notifications.ts:44](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/notifications.ts#L44)

Powiadamia kadrę zarządzającą firmy (RPC, member).

#### Parameters

##### client

[`TypedSupabaseClient`](../api/api/src.md#typedsupabaseclient)

##### p

###### body?

`string`

###### companyId

`string`

###### severity?

`string`

###### title

`string`

###### type

`string`

#### Returns

`Promise`\<`void`\>

***

### parkingSummaries()

> **parkingSummaries**(`sb`, `poiIds`): `Promise`\<`Map`\<`string`, [`ParkingSummary`](../api/api/src.md#parkingsummary)\>\>

Defined in: [api/src/data/parkingReviews.ts:89](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/parkingReviews.ts#L89)

Zbiorcze podsumowania dla widocznych POI (agregacja po stronie klienta —
 ocen na parking jest mało; unika RPC/widoku).

#### Parameters

##### sb

`DB`

##### poiIds

`string`[]

#### Returns

`Promise`\<`Map`\<`string`, [`ParkingSummary`](../api/api/src.md#parkingsummary)\>\>

***

### removeDamagePhoto()

> **removeDamagePhoto**(`client`, `path`): `Promise`\<`void`\>

Defined in: [api/src/data/damagePhotos.ts:62](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/damagePhotos.ts#L62)

Usunięcie dowodu — polityka storage ogranicza wg roli (jak zdjęcia ładunku).

#### Parameters

##### client

[`TypedSupabaseClient`](../api/api/src.md#typedsupabaseclient)

##### path

`string`

#### Returns

`Promise`\<`void`\>

***

### removeThreadMember()

> **removeThreadMember**(`client`, `threadId`, `userId`): `Promise`\<`void`\>

Defined in: [api/src/data/messages.ts:177](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/messages.ts#L177)

Usunięcie członka (zarząd) lub wyjście z kanału (samodzielnie).

#### Parameters

##### client

[`TypedSupabaseClient`](../api/api/src.md#typedsupabaseclient)

##### threadId

`string`

##### userId

`string`

#### Returns

`Promise`\<`void`\>

***

### renameThread()

> **renameThread**(`client`, `threadId`, `name`): `Promise`\<`void`\>

Defined in: [api/src/data/messages.ts:134](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/messages.ts#L134)

Zmiana nazwy kanału (zarząd lub twórca).

#### Parameters

##### client

[`TypedSupabaseClient`](../api/api/src.md#typedsupabaseclient)

##### threadId

`string`

##### name

`string`

#### Returns

`Promise`\<`void`\>

***

### saveChecklistTemplate()

> **saveChecklistTemplate**(`client`, `companyId`, `tpl`): `Promise`\<`void`\>

Defined in: [api/src/data/checklists.ts:87](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/checklists.ts#L87)

Zapis/edycja szablonu (owner/dispatcher). Bez id → insert.

#### Parameters

##### client

[`TypedSupabaseClient`](../api/api/src.md#typedsupabaseclient)

##### companyId

`string`

##### tpl

###### active?

`boolean`

###### assignedDrivers?

`string`[]

###### id?

`string`

###### items

[`ChecklistItem`](../api/core/src.md#checklistitem)[]

###### name

`string`

#### Returns

`Promise`\<`void`\>

***

### saveDefaultRate()

> **saveDefaultRate**(`client`, `input`): `Promise`\<`void`\>

Defined in: [api/src/data/rates.ts:43](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/rates.ts#L43)

Zapisuje domyślną stawkę jako nowy wpis (`valid_from` = dziś, z domyślnej bazy).
Historia stawek zachowana; `pickRate` bierze najnowszą. RLS: owner.

#### Parameters

##### client

[`TypedSupabaseClient`](../api/api/src.md#typedsupabaseclient)

##### input

###### companyId

`string`

###### currency?

`string`

###### ratePerKm

`number`

###### vehicleId

`string` \| `null`

#### Returns

`Promise`\<`void`\>

***

### saveExpoPushToken()

> **saveExpoPushToken**(`client`, `userId`, `input`): `Promise`\<`void`\>

Defined in: [api/src/data/expoPush.ts:14](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/expoPush.ts#L14)

Zapisuje token push Expo bieżącego użytkownika (idempotentnie po `token`).
RLS: `user_id = auth.uid()` (ustawiany triggerem/domyślnie? — podajemy jawnie).

#### Parameters

##### client

[`TypedSupabaseClient`](../api/api/src.md#typedsupabaseclient)

##### userId

`string`

##### input

[`ExpoPushTokenInput`](../api/api/src.md#expopushtokeninput)

#### Returns

`Promise`\<`void`\>

***

### saveOrder()

> **saveOrder**(`client`, `companyId`, `input`, `id?`): `Promise`\<`string`\>

Defined in: [api/src/data/orders.ts:85](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/orders.ts#L85)

#### Parameters

##### client

[`TypedSupabaseClient`](../api/api/src.md#typedsupabaseclient)

##### companyId

`string`

##### input

###### assignedTo?

`string` = `...`

###### cargo?

`string` = `...`

###### consignee?

`string` = `...`

###### currency

`string` = `...`

###### destination?

`string` = `...`

###### loadDate?

`string` = `...`

###### notes?

`string` = `...`

###### origin?

`string` = `...`

###### price?

`number` = `...`

###### referenceNo?

`string` = `...`

###### shipper?

`string` = `...`

###### unloadDate?

`string` = `...`

###### vehicleId?

`string` = `...`

###### weightKg?

`number` = `...`

##### id?

`string`

#### Returns

`Promise`\<`string`\>

***

### savePushSubscription()

> **savePushSubscription**(`client`, `sub`, `ctx`): `Promise`\<`void`\>

Defined in: [api/src/data/push.ts:17](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/push.ts#L17)

Zapisuje (upsert po `endpoint`) subskrypcję bieżącego użytkownika. RLS: user_id = auth.uid().

#### Parameters

##### client

[`TypedSupabaseClient`](../api/api/src.md#typedsupabaseclient)

##### sub

[`PushSubscriptionJSON`](../api/api/src.md#pushsubscriptionjson)

##### ctx

###### companyId?

`string` \| `null`

###### userAgent?

`string`

###### userId

`string`

#### Returns

`Promise`\<`void`\>

***

### saveServiceTask()

> **saveServiceTask**(`client`, `companyId`, `input`, `id?`): `Promise`\<`string`\>

Defined in: [api/src/data/service.ts:59](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/service.ts#L59)

#### Parameters

##### client

[`TypedSupabaseClient`](../api/api/src.md#typedsupabaseclient)

##### companyId

`string`

##### input

[`ServiceTaskInput`](../api/api/src.md#servicetaskinput)

##### id?

`string`

#### Returns

`Promise`\<`string`\>

***

### saveSettlementSettings()

> **saveSettlementSettings**(`client`, `companyId`, `s`): `Promise`\<`void`\>

Defined in: [api/src/data/settlementSettings.ts:30](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/settlementSettings.ts#L30)

Zapis ustawień (upsert). RLS: wyłącznie owner.

#### Parameters

##### client

[`TypedSupabaseClient`](../api/api/src.md#typedsupabaseclient)

##### companyId

`string`

##### s

[`SettlementSettings`](../api/core/src.md#settlementsettings)

#### Returns

`Promise`\<`void`\>

***

### sendDriverRoute()

> **sendDriverRoute**(`client`, `companyId`, `driverId`, `route`): `Promise`\<`string`\>

Defined in: [api/src/data/driverRoutes.ts:28](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/driverRoutes.ts#L28)

Wysyłka trasy do kierowcy (RPC, owner/dispatcher). Zwraca id trasy.

#### Parameters

##### client

[`TypedSupabaseClient`](../api/api/src.md#typedsupabaseclient)

##### companyId

`string`

##### driverId

`string`

##### route

###### geometry

\[`number`, `number`\][]

###### name

`string`

###### stops

[`RouteStopPoint`](../api/api/src.md#routestoppoint)[]

###### summary

[`DriverRouteSummary`](../api/api/src.md#driverroutesummary-1)

#### Returns

`Promise`\<`string`\>

***

### sendMessage()

> **sendMessage**(`client`, `companyId`, `body`, `senderLabel`, `opts?`): `Promise`\<[`ChatMessage`](../api/api/src.md#chatmessage)\>

Defined in: [api/src/data/messages.ts:46](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/messages.ts#L46)

Wysyłka (tekst i/lub zdjęcie) we własnym imieniu.

#### Parameters

##### client

[`TypedSupabaseClient`](../api/api/src.md#typedsupabaseclient)

##### companyId

`string`

##### body

`string`

##### senderLabel

`string`

##### opts?

###### photoPath?

`string` \| `null`

###### threadId?

`string` \| `null`

#### Returns

`Promise`\<[`ChatMessage`](../api/api/src.md#chatmessage)\>

***

### setChecklistActive()

> **setChecklistActive**(`client`, `id`, `active`): `Promise`\<`void`\>

Defined in: [api/src/data/checklists.ts:74](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/checklists.ts#L74)

#338: szybkie włącz/wyłącz szablonu (owner/dispatcher).

#### Parameters

##### client

[`TypedSupabaseClient`](../api/api/src.md#typedsupabaseclient)

##### id

`string`

##### active

`boolean`

#### Returns

`Promise`\<`void`\>

***

### setDamageClaimStatus()

> **setDamageClaimStatus**(`client`, `id`, `status`): `Promise`\<`void`\>

Defined in: [api/src/data/damageClaims.ts:83](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/damageClaims.ts#L83)

Zmiana statusu szkody. RLS: owner/dispatcher.

#### Parameters

##### client

[`TypedSupabaseClient`](../api/api/src.md#typedsupabaseclient)

##### id

`string`

##### status

`"in_progress"` \| `"reported"` \| `"repaired"` \| `"closed"` \| `"rejected"`

#### Returns

`Promise`\<`void`\>

***

### setDocumentVisibility()

> **setDocumentVisibility**(`client`, `docId`, `visibility`, `allowedUserIds?`): `Promise`\<`void`\>

Defined in: [api/src/data/documents.ts:122](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/documents.ts#L122)

#275: zmiana widoczności dokumentu (owner/dispatcher — RLS write).

#### Parameters

##### client

[`TypedSupabaseClient`](../api/api/src.md#typedsupabaseclient)

##### docId

`string`

##### visibility

`"company"` \| `"management"` \| `"selected"`

##### allowedUserIds?

`string`[] = `[]`

#### Returns

`Promise`\<`void`\>

***

### setDriverDocuments()

> **setDriverDocuments**(`client`, `driverId`, `docs`): `Promise`\<`void`\>

Defined in: [api/src/data/drivers.ts:83](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/drivers.ts#L83)

Zapis (szyfrowanie) numerów dokumentów — RPC, owner/dispatcher, audytowane.

#### Parameters

##### client

[`TypedSupabaseClient`](../api/api/src.md#typedsupabaseclient)

##### driverId

`string`

##### docs

###### idCard?

`string`

###### license?

`string`

###### passport?

`string`

#### Returns

`Promise`\<`void`\>

***

### setDriverExpenseStatus()

> **setDriverExpenseStatus**(`client`, `id`, `status`): `Promise`\<`void`\>

Defined in: [api/src/data/driverExpenses.ts:86](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/driverExpenses.ts#L86)

Zatwierdzenie/odrzucenie (RLS: owner/dispatcher).

#### Parameters

##### client

[`TypedSupabaseClient`](../api/api/src.md#typedsupabaseclient)

##### id

`string`

##### status

[`ExpenseStatus`](../api/api/src.md#expensestatus)

#### Returns

`Promise`\<`void`\>

***

### setFuelCardPin()

> **setFuelCardPin**(`client`, `cardId`, `pin`): `Promise`\<`void`\>

Defined in: [api/src/data/fuelCards.ts:86](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/fuelCards.ts#L86)

Ustawia (szyfruje) PIN karty — RPC, tylko owner.

#### Parameters

##### client

[`TypedSupabaseClient`](../api/api/src.md#typedsupabaseclient)

##### cardId

`string`

##### pin

`string`

#### Returns

`Promise`\<`void`\>

***

### setInvoicePaid()

> **setInvoicePaid**(`client`, `id`, `paid`): `Promise`\<`void`\>

Defined in: [api/src/data/invoices.ts:88](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/invoices.ts#L88)

Oznacza fakturę jako opłaconą (`paid=true`) lub cofa płatność. RLS: owner/dispatcher; audyt.

#### Parameters

##### client

[`TypedSupabaseClient`](../api/api/src.md#typedsupabaseclient)

##### id

`string`

##### paid

`boolean`

#### Returns

`Promise`\<`void`\>

***

### setInvoiceStatus()

> **setInvoiceStatus**(`client`, `id`, `status`): `Promise`\<`void`\>

Defined in: [api/src/data/invoices.ts:78](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/invoices.ts#L78)

Zmiana statusu faktury (np. anulowanie). RLS: owner/dispatcher; zmiana audytowana.

#### Parameters

##### client

[`TypedSupabaseClient`](../api/api/src.md#typedsupabaseclient)

##### id

`string`

##### status

`"cancelled"` \| `"issued"`

#### Returns

`Promise`\<`void`\>

***

### setOrderStatus()

> **setOrderStatus**(`client`, `id`, `status`): `Promise`\<`void`\>

Defined in: [api/src/data/orders.ts:106](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/orders.ts#L106)

Zmiana statusu przez RPC z kontrolą uprawnień: owner/dispatcher → dowolny status,
przypisany kierowca → tylko operacyjny (w trakcie / dostarczone). Audytowane.

#### Parameters

##### client

[`TypedSupabaseClient`](../api/api/src.md#typedsupabaseclient)

##### id

`string`

##### status

`"new"` \| `"assigned"` \| `"in_progress"` \| `"delivered"` \| `"invoiced"` \| `"cancelled"`

#### Returns

`Promise`\<`void`\>

***

### subscribeMessages()

> **subscribeMessages**(`client`, `companyId`, `onMessage`): () => `void`

Defined in: [api/src/data/messages.ts:72](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/messages.ts#L72)

Subskrypcja nowych wiadomości firmy; filtrowanie po wątku robi wywołujący
(realtime nie wspiera filtrów złożonych). Zwraca funkcję sprzątającą.

#### Parameters

##### client

[`TypedSupabaseClient`](../api/api/src.md#typedsupabaseclient)

##### companyId

`string`

##### onMessage

(`m`) => `void`

#### Returns

() => `void`

***

### trackingUrl()

> **trackingUrl**(`token`, `base?`): `string`

Defined in: [api/src/data/orderTracking.ts:49](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/orderTracking.ts#L49)

Link do publicznej strony śledzenia (QR/klient).

#### Parameters

##### token

`string`

##### base?

`string` = `"https://e-logistic-one.vercel.app"`

#### Returns

`string`

***

### tripEventToRow()

> **tripEventToRow**(`input`, `ctx`): \{ `action`: `"other"` \| `"load"` \| `"unload"` \| `"transshipment"` \| `"start"` \| `"end"` \| `"service"`; `amount`: `number` \| `null`; `comment`: `string` \| `null`; `company`: `string` \| `null`; `company_id`: `string`; `country`: `string`; `device_id`: `string` \| `null`; `driver_id`: `string`; `from_vehicle_reg`: `string` \| `null`; `geo`: `string` \| `null`; `id`: `string`; `location`: `string` \| `null`; `odometer_km`: `number`; `postcode`: `string` \| `null`; `to_vehicle_reg`: `string` \| `null`; `vehicle_id`: `string`; `weight_kg`: `number` \| `null` \| `undefined`; \} \| \{ `action`: `"other"` \| `"load"` \| `"unload"` \| `"transshipment"` \| `"start"` \| `"end"` \| `"service"`; `amount`: `number` \| `null`; `comment`: `string` \| `null`; `company`: `string` \| `null`; `company_id`: `string`; `country`: `string`; `device_id`: `string` \| `null`; `driver_id`: `string`; `from_vehicle_reg`: `string` \| `null`; `geo`: `string` \| `null`; `id`: `string`; `location`: `string` \| `null`; `odometer_km`: `number`; `order_id`: `string`; `postcode`: `string` \| `null`; `to_vehicle_reg`: `string` \| `null`; `vehicle_id`: `string`; `weight_kg`: `number` \| `null` \| `undefined`; \}

Defined in: [api/src/data/tripEvents.ts:14](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/tripEvents.ts#L14)

Mapuje zwalidowany input Trip na wiersz tabeli (snake_case + WKT dla PostGIS).

#### Parameters

##### input

\{ `action`: `"load"`; `comment?`: `string`; `odometerKm`: `number`; `orderId?`: `string`; `place`: \{ `city?`: `string`; `company?`: `string`; `country`: `string`; `lat?`: `number`; `lng?`: `number`; `location?`: `string`; `postcode?`: `string`; \}; `vehicleId`: `string`; `weightKg?`: `number`; \} \| \{ `action`: `"unload"`; `comment?`: `string`; `odometerKm`: `number`; `orderId?`: `string`; `place`: \{ `city?`: `string`; `company?`: `string`; `country`: `string`; `lat?`: `number`; `lng?`: `number`; `location?`: `string`; `postcode?`: `string`; \}; `vehicleId`: `string`; `weightKg?`: `number`; \} \| \{ `action`: `"transshipment"`; `comment?`: `string`; `fromVehicleReg`: `string`; `odometerKm`: `number`; `orderId?`: `string`; `place`: \{ `city?`: `string`; `company?`: `string`; `country`: `string`; `lat?`: `number`; `lng?`: `number`; `location?`: `string`; `postcode?`: `string`; \}; `toVehicleReg`: `string`; `vehicleId`: `string`; `weightKg?`: `number`; \} \| \{ `action`: `"start"`; `comment?`: `string`; `odometerKm`: `number`; `place`: \{ `city?`: `string`; `company?`: `string`; `country`: `string`; `lat?`: `number`; `lng?`: `number`; `location?`: `string`; `postcode?`: `string`; \}; `vehicleId`: `string`; \} \| \{ `action`: `"end"`; `comment?`: `string`; `odometerKm`: `number`; `place`: \{ `city?`: `string`; `company?`: `string`; `country`: `string`; `lat?`: `number`; `lng?`: `number`; `location?`: `string`; `postcode?`: `string`; \}; `vehicleId`: `string`; \} \| \{ `action`: `"service"`; `amount?`: `number`; `comment`: `string`; `odometerKm`: `number`; `place`: \{ `city?`: `string`; `company?`: `string`; `country`: `string`; `lat?`: `number`; `lng?`: `number`; `location?`: `string`; `postcode?`: `string`; \}; `vehicleId`: `string`; \} \| \{ `action`: `"other"`; `amount?`: `number`; `comment`: `string`; `odometerKm`: `number`; `place`: \{ `city?`: `string`; `company?`: `string`; `country`: `string`; `lat?`: `number`; `lng?`: `number`; `location?`: `string`; `postcode?`: `string`; \}; `vehicleId`: `string`; \}

###### Type Literal

\{ `action`: `"load"`; `comment?`: `string`; `odometerKm`: `number`; `orderId?`: `string`; `place`: \{ `city?`: `string`; `company?`: `string`; `country`: `string`; `lat?`: `number`; `lng?`: `number`; `location?`: `string`; `postcode?`: `string`; \}; `vehicleId`: `string`; `weightKg?`: `number`; \}

###### action

`"load"` = `...`

###### comment?

`string` = `...`

###### odometerKm

`number` = `...`

###### orderId?

`string` = `...`

Powiązanie z zleceniem (do auto-zamykania + kosztu transportu).

###### place

\{ `city?`: `string`; `company?`: `string`; `country`: `string`; `lat?`: `number`; `lng?`: `number`; `location?`: `string`; `postcode?`: `string`; \} = `geoLocationSchema`

###### place.city?

`string` = `...`

###### place.company?

`string` = `...`

Nazwa firmy w miejscu (opcjonalnie).

###### place.country

`string` = `...`

###### place.lat?

`number` = `...`

###### place.lng?

`number` = `...`

###### place.location?

`string` = `...`

###### place.postcode?

`string` = `...`

Kod pocztowy (np. wymagany dla UK/Anglii).

###### vehicleId

`string` = `...`

###### weightKg?

`number` = `...`

***

###### Type Literal

\{ `action`: `"transshipment"`; `comment?`: `string`; `fromVehicleReg`: `string`; `odometerKm`: `number`; `orderId?`: `string`; `place`: \{ `city?`: `string`; `company?`: `string`; `country`: `string`; `lat?`: `number`; `lng?`: `number`; `location?`: `string`; `postcode?`: `string`; \}; `toVehicleReg`: `string`; `vehicleId`: `string`; `weightKg?`: `number`; \}

###### action

`"transshipment"` = `...`

###### comment?

`string` = `...`

###### fromVehicleReg

`string` = `...`

Rejestracja auta, Z KTÓREGO przeładowano.

###### odometerKm

`number` = `...`

###### orderId?

`string` = `...`

###### place

\{ `city?`: `string`; `company?`: `string`; `country`: `string`; `lat?`: `number`; `lng?`: `number`; `location?`: `string`; `postcode?`: `string`; \} = `geoLocationSchema`

###### place.city?

`string` = `...`

###### place.company?

`string` = `...`

Nazwa firmy w miejscu (opcjonalnie).

###### place.country

`string` = `...`

###### place.lat?

`number` = `...`

###### place.lng?

`number` = `...`

###### place.location?

`string` = `...`

###### place.postcode?

`string` = `...`

Kod pocztowy (np. wymagany dla UK/Anglii).

###### toVehicleReg

`string` = `...`

Rejestracja auta, NA KTÓRE przeładowano.

###### vehicleId

`string` = `...`

###### weightKg?

`number` = `...`

***

###### Type Literal

\{ `action`: `"service"`; `amount?`: `number`; `comment`: `string`; `odometerKm`: `number`; `place`: \{ `city?`: `string`; `company?`: `string`; `country`: `string`; `lat?`: `number`; `lng?`: `number`; `location?`: `string`; `postcode?`: `string`; \}; `vehicleId`: `string`; \}

###### action

`"service"` = `...`

###### amount?

`number` = `...`

Kwota płatności za serwis — opcjonalna.

###### comment

`string` = `...`

Co zostało naprawione — wymagane.

###### odometerKm

`number` = `...`

###### place

\{ `city?`: `string`; `company?`: `string`; `country`: `string`; `lat?`: `number`; `lng?`: `number`; `location?`: `string`; `postcode?`: `string`; \} = `geoLocationSchema`

###### place.city?

`string` = `...`

###### place.company?

`string` = `...`

Nazwa firmy w miejscu (opcjonalnie).

###### place.country

`string` = `...`

###### place.lat?

`number` = `...`

###### place.lng?

`number` = `...`

###### place.location?

`string` = `...`

###### place.postcode?

`string` = `...`

Kod pocztowy (np. wymagany dla UK/Anglii).

###### vehicleId

`string` = `...`

***

###### Type Literal

\{ `action`: `"other"`; `amount?`: `number`; `comment`: `string`; `odometerKm`: `number`; `place`: \{ `city?`: `string`; `company?`: `string`; `country`: `string`; `lat?`: `number`; `lng?`: `number`; `location?`: `string`; `postcode?`: `string`; \}; `vehicleId`: `string`; \}

###### action

`"other"` = `...`

###### amount?

`number` = `...`

###### comment

`string` = `...`

Opis wykonywanej akcji — wymagany.

###### odometerKm

`number` = `...`

###### place

\{ `city?`: `string`; `company?`: `string`; `country`: `string`; `lat?`: `number`; `lng?`: `number`; `location?`: `string`; `postcode?`: `string`; \} = `geoLocationSchema`

###### place.city?

`string` = `...`

###### place.company?

`string` = `...`

Nazwa firmy w miejscu (opcjonalnie).

###### place.country

`string` = `...`

###### place.lat?

`number` = `...`

###### place.lng?

`number` = `...`

###### place.location?

`string` = `...`

###### place.postcode?

`string` = `...`

Kod pocztowy (np. wymagany dla UK/Anglii).

###### vehicleId

`string` = `...`

##### ctx

[`TripEventContext`](../api/api/src.md#tripeventcontext)

#### Returns

\{ `action`: `"other"` \| `"load"` \| `"unload"` \| `"transshipment"` \| `"start"` \| `"end"` \| `"service"`; `amount`: `number` \| `null`; `comment`: `string` \| `null`; `company`: `string` \| `null`; `company_id`: `string`; `country`: `string`; `device_id`: `string` \| `null`; `driver_id`: `string`; `from_vehicle_reg`: `string` \| `null`; `geo`: `string` \| `null`; `id`: `string`; `location`: `string` \| `null`; `odometer_km`: `number`; `postcode`: `string` \| `null`; `to_vehicle_reg`: `string` \| `null`; `vehicle_id`: `string`; `weight_kg`: `number` \| `null` \| `undefined`; \} \| \{ `action`: `"other"` \| `"load"` \| `"unload"` \| `"transshipment"` \| `"start"` \| `"end"` \| `"service"`; `amount`: `number` \| `null`; `comment`: `string` \| `null`; `company`: `string` \| `null`; `company_id`: `string`; `country`: `string`; `device_id`: `string` \| `null`; `driver_id`: `string`; `from_vehicle_reg`: `string` \| `null`; `geo`: `string` \| `null`; `id`: `string`; `location`: `string` \| `null`; `odometer_km`: `number`; `order_id`: `string`; `postcode`: `string` \| `null`; `to_vehicle_reg`: `string` \| `null`; `vehicle_id`: `string`; `weight_kg`: `number` \| `null` \| `undefined`; \}

***

### updateCompany()

> **updateCompany**(`client`, `companyId`, `patch`): `Promise`\<`void`\>

Defined in: [api/src/data/companies.ts:47](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/companies.ts#L47)

Aktualizacja danych firmy (sprzedawca + domyślne fakturowe). RLS: owner.

#### Parameters

##### client

[`TypedSupabaseClient`](../api/api/src.md#typedsupabaseclient)

##### companyId

`string`

##### patch

[`CompanyPatch`](../api/api/src.md#companypatch)

#### Returns

`Promise`\<`void`\>

***

### updateContractor()

> **updateContractor**(`client`, `id`, `input`): `Promise`\<`void`\>

Defined in: [api/src/data/contractors.ts:60](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/contractors.ts#L60)

Aktualizuje kontrahenta po id (edycja w rejestrze, w tym zmiana nazwy). RLS: owner/dispatcher.

#### Parameters

##### client

[`TypedSupabaseClient`](../api/api/src.md#typedsupabaseclient)

##### id

`string`

##### input

[`ContractorInput`](../api/api/src.md#contractorinput)

#### Returns

`Promise`\<`void`\>

***

### updateDefectStatus()

> **updateDefectStatus**(`client`, `id`, `status`, `resolvedBy?`): `Promise`\<`void`\>

Defined in: [api/src/data/defects.ts:47](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/defects.ts#L47)

Zmiana statusu usterki (owner/dispatcher = mechanik, lub autor).

#### Parameters

##### client

[`TypedSupabaseClient`](../api/api/src.md#typedsupabaseclient)

##### id

`string`

##### status

`"in_progress"` \| `"open"` \| `"resolved"`

##### resolvedBy?

`string`

#### Returns

`Promise`\<`void`\>

***

### updateDriver()

> **updateDriver**(`client`, `driverId`, `input`, `companyId`): `Promise`\<`void`\>

Defined in: [api/src/data/drivers.ts:73](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/drivers.ts#L73)

#### Parameters

##### client

[`TypedSupabaseClient`](../api/api/src.md#typedsupabaseclient)

##### driverId

`string`

##### input

###### adrExpiry?

`string` = `...`

###### birthDate?

`string` = `...`

###### code95Expiry?

`string` = `...`

###### firstName

`string` = `...`

###### idCardExpiry?

`string` = `...`

###### idCardNumber?

`string` = `...`

###### lastName

`string` = `...`

###### licenseCategories

`string`[] = `...`

###### licenseExpiry?

`string` = `...`

###### licenseNumber?

`string` = `...`

###### medicalExpiry?

`string` = `...`

###### notes?

`string` = `...`

###### passportExpiry?

`string` = `...`

###### passportNumber?

`string` = `...`

###### psychotechExpiry?

`string` = `...`

###### qualificationDetails

`object`[] = `...`

#319: uprawnienia (UDT/HDS itd.) z numerem dokumentu i datą ważności.

###### qualifications

`string`[] = `...`

##### companyId

`string`

#### Returns

`Promise`\<`void`\>

***

### updateFuelCard()

> **updateFuelCard**(`client`, `cardId`, `input`): `Promise`\<`void`\>

Defined in: [api/src/data/fuelCards.ts:64](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/fuelCards.ts#L64)

Edytuje kartę (pola jawne — PIN ustawiany osobno przez `setFuelCardPin`). RLS: owner.

#### Parameters

##### client

[`TypedSupabaseClient`](../api/api/src.md#typedsupabaseclient)

##### cardId

`string`

##### input

###### cardNumberMasked

`string` = `...`

###### discountPercent

`number` = `...`

###### notes?

`string` = `...`

###### pin?

`string` = `...`

PIN tylko na wejściu — w bazie przechowywany zaszyfrowany (nigdy plaintext).

###### provider

`"dkv"` \| `"eurowag"` \| `"shell"` \| `"bp"` \| `"circlek"` \| `"e100"` \| `"uta"` \| `"as24"` \| `"aral"` \| `"omv"` \| `"routex"` \| `"logpay"` \| `"esso"` \| `"totalenergies"` \| `"tankpool24"` \| `"morganfuels"` \| `"iqcard"` \| `"other"` = `...`

###### validUntil?

`string` = `...`

###### vehicleId?

`string` = `...`

Karta przypisana do pojazdu (opcjonalnie) — dla widoczności która karta do którego auta.

#### Returns

`Promise`\<`void`\>

***

### updateFuelLog()

> **updateFuelLog**(`client`, `id`, `input`, `table?`): `Promise`\<`void`\>

Defined in: [api/src/data/fuelLogs.ts:72](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/fuelLogs.ts#L72)

Edycja wpisu paliwo/AdBlue. RLS: autor (kierowca) lub owner. Geo nadpisywane tylko gdy podane.

#### Parameters

##### client

[`TypedSupabaseClient`](../api/api/src.md#typedsupabaseclient)

##### id

`string`

##### input

###### comment?

`string` = `...`

###### fuelCardId?

`string` = `...`

###### isFull

`boolean` = `...`

Czy zatankowano „do pełna" — do liczenia spalania (full-to-full).

###### liters

`number` = `...`

###### odometerKm

`number` = `...`

###### paymentMethod

`"card"` \| `"cash"` = `...`

###### priceTotal?

`number` = `...`

###### station

\{ `city?`: `string`; `company?`: `string`; `country`: `string`; `lat?`: `number`; `lng?`: `number`; `location?`: `string`; `postcode?`: `string`; \} = `geoLocationSchema`

###### station.city?

`string` = `...`

###### station.company?

`string` = `...`

Nazwa firmy w miejscu (opcjonalnie).

###### station.country

`string` = `...`

###### station.lat?

`number` = `...`

###### station.lng?

`number` = `...`

###### station.location?

`string` = `...`

###### station.postcode?

`string` = `...`

Kod pocztowy (np. wymagany dla UK/Anglii).

###### vehicleId

`string` = `...`

##### table?

`"adblue_logs"` \| `"fuel_logs"`

#### Returns

`Promise`\<`void`\>

***

### updateMember()

> **updateMember**(`client`, `companyId`, `userId`, `patch`): `Promise`\<`void`\>

Defined in: [api/src/data/memberships.ts:61](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/memberships.ts#L61)

Aktualizacja roli i modułów członka (owner).

#### Parameters

##### client

[`TypedSupabaseClient`](../api/api/src.md#typedsupabaseclient)

##### companyId

`string`

##### userId

`string`

##### patch

###### modules?

`string`[] \| `null`

###### permissions?

`Partial`\<`Record`\<`"vehicles"` \| `"drivers"` \| `"cards"` \| `"forms"` \| `"reports"` \| `"map"` \| `"stats"` \| `"settlements"` \| `"orders"` \| `"checklists"` \| `"documents"` \| `"damages"`, `"none"` \| `"view"` \| `"edit"`\>\>

###### role?

`"developer"` \| `"owner"` \| `"dispatcher"` \| `"driver"`

#### Returns

`Promise`\<`void`\>

***

### updateMyPhone()

> **updateMyPhone**(`client`, `phone`): `Promise`\<`void`\>

Defined in: [api/src/data/profile.ts:36](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/profile.ts#L36)

Telefon kontaktowy w user_metadata (bez SMS-owej weryfikacji auth).

#### Parameters

##### client

[`TypedSupabaseClient`](../api/api/src.md#typedsupabaseclient)

##### phone

`string`

#### Returns

`Promise`\<`void`\>

***

### updateTripEvent()

> **updateTripEvent**(`client`, `id`, `input`): `Promise`\<`void`\>

Defined in: [api/src/data/tripEvents.ts:68](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/tripEvents.ts#L68)

Edycja zdarzenia Trip. RLS: autor (kierowca) lub owner. Geo nadpisywane tylko gdy podane.

#### Parameters

##### client

[`TypedSupabaseClient`](../api/api/src.md#typedsupabaseclient)

##### id

`string`

##### input

\{ `action`: `"load"`; `comment?`: `string`; `odometerKm`: `number`; `orderId?`: `string`; `place`: \{ `city?`: `string`; `company?`: `string`; `country`: `string`; `lat?`: `number`; `lng?`: `number`; `location?`: `string`; `postcode?`: `string`; \}; `vehicleId`: `string`; `weightKg?`: `number`; \} \| \{ `action`: `"unload"`; `comment?`: `string`; `odometerKm`: `number`; `orderId?`: `string`; `place`: \{ `city?`: `string`; `company?`: `string`; `country`: `string`; `lat?`: `number`; `lng?`: `number`; `location?`: `string`; `postcode?`: `string`; \}; `vehicleId`: `string`; `weightKg?`: `number`; \} \| \{ `action`: `"transshipment"`; `comment?`: `string`; `fromVehicleReg`: `string`; `odometerKm`: `number`; `orderId?`: `string`; `place`: \{ `city?`: `string`; `company?`: `string`; `country`: `string`; `lat?`: `number`; `lng?`: `number`; `location?`: `string`; `postcode?`: `string`; \}; `toVehicleReg`: `string`; `vehicleId`: `string`; `weightKg?`: `number`; \} \| \{ `action`: `"start"`; `comment?`: `string`; `odometerKm`: `number`; `place`: \{ `city?`: `string`; `company?`: `string`; `country`: `string`; `lat?`: `number`; `lng?`: `number`; `location?`: `string`; `postcode?`: `string`; \}; `vehicleId`: `string`; \} \| \{ `action`: `"end"`; `comment?`: `string`; `odometerKm`: `number`; `place`: \{ `city?`: `string`; `company?`: `string`; `country`: `string`; `lat?`: `number`; `lng?`: `number`; `location?`: `string`; `postcode?`: `string`; \}; `vehicleId`: `string`; \} \| \{ `action`: `"service"`; `amount?`: `number`; `comment`: `string`; `odometerKm`: `number`; `place`: \{ `city?`: `string`; `company?`: `string`; `country`: `string`; `lat?`: `number`; `lng?`: `number`; `location?`: `string`; `postcode?`: `string`; \}; `vehicleId`: `string`; \} \| \{ `action`: `"other"`; `amount?`: `number`; `comment`: `string`; `odometerKm`: `number`; `place`: \{ `city?`: `string`; `company?`: `string`; `country`: `string`; `lat?`: `number`; `lng?`: `number`; `location?`: `string`; `postcode?`: `string`; \}; `vehicleId`: `string`; \}

###### Type Literal

\{ `action`: `"load"`; `comment?`: `string`; `odometerKm`: `number`; `orderId?`: `string`; `place`: \{ `city?`: `string`; `company?`: `string`; `country`: `string`; `lat?`: `number`; `lng?`: `number`; `location?`: `string`; `postcode?`: `string`; \}; `vehicleId`: `string`; `weightKg?`: `number`; \}

###### action

`"load"` = `...`

###### comment?

`string` = `...`

###### odometerKm

`number` = `...`

###### orderId?

`string` = `...`

Powiązanie z zleceniem (do auto-zamykania + kosztu transportu).

###### place

\{ `city?`: `string`; `company?`: `string`; `country`: `string`; `lat?`: `number`; `lng?`: `number`; `location?`: `string`; `postcode?`: `string`; \} = `geoLocationSchema`

###### place.city?

`string` = `...`

###### place.company?

`string` = `...`

Nazwa firmy w miejscu (opcjonalnie).

###### place.country

`string` = `...`

###### place.lat?

`number` = `...`

###### place.lng?

`number` = `...`

###### place.location?

`string` = `...`

###### place.postcode?

`string` = `...`

Kod pocztowy (np. wymagany dla UK/Anglii).

###### vehicleId

`string` = `...`

###### weightKg?

`number` = `...`

***

###### Type Literal

\{ `action`: `"transshipment"`; `comment?`: `string`; `fromVehicleReg`: `string`; `odometerKm`: `number`; `orderId?`: `string`; `place`: \{ `city?`: `string`; `company?`: `string`; `country`: `string`; `lat?`: `number`; `lng?`: `number`; `location?`: `string`; `postcode?`: `string`; \}; `toVehicleReg`: `string`; `vehicleId`: `string`; `weightKg?`: `number`; \}

###### action

`"transshipment"` = `...`

###### comment?

`string` = `...`

###### fromVehicleReg

`string` = `...`

Rejestracja auta, Z KTÓREGO przeładowano.

###### odometerKm

`number` = `...`

###### orderId?

`string` = `...`

###### place

\{ `city?`: `string`; `company?`: `string`; `country`: `string`; `lat?`: `number`; `lng?`: `number`; `location?`: `string`; `postcode?`: `string`; \} = `geoLocationSchema`

###### place.city?

`string` = `...`

###### place.company?

`string` = `...`

Nazwa firmy w miejscu (opcjonalnie).

###### place.country

`string` = `...`

###### place.lat?

`number` = `...`

###### place.lng?

`number` = `...`

###### place.location?

`string` = `...`

###### place.postcode?

`string` = `...`

Kod pocztowy (np. wymagany dla UK/Anglii).

###### toVehicleReg

`string` = `...`

Rejestracja auta, NA KTÓRE przeładowano.

###### vehicleId

`string` = `...`

###### weightKg?

`number` = `...`

***

###### Type Literal

\{ `action`: `"service"`; `amount?`: `number`; `comment`: `string`; `odometerKm`: `number`; `place`: \{ `city?`: `string`; `company?`: `string`; `country`: `string`; `lat?`: `number`; `lng?`: `number`; `location?`: `string`; `postcode?`: `string`; \}; `vehicleId`: `string`; \}

###### action

`"service"` = `...`

###### amount?

`number` = `...`

Kwota płatności za serwis — opcjonalna.

###### comment

`string` = `...`

Co zostało naprawione — wymagane.

###### odometerKm

`number` = `...`

###### place

\{ `city?`: `string`; `company?`: `string`; `country`: `string`; `lat?`: `number`; `lng?`: `number`; `location?`: `string`; `postcode?`: `string`; \} = `geoLocationSchema`

###### place.city?

`string` = `...`

###### place.company?

`string` = `...`

Nazwa firmy w miejscu (opcjonalnie).

###### place.country

`string` = `...`

###### place.lat?

`number` = `...`

###### place.lng?

`number` = `...`

###### place.location?

`string` = `...`

###### place.postcode?

`string` = `...`

Kod pocztowy (np. wymagany dla UK/Anglii).

###### vehicleId

`string` = `...`

***

###### Type Literal

\{ `action`: `"other"`; `amount?`: `number`; `comment`: `string`; `odometerKm`: `number`; `place`: \{ `city?`: `string`; `company?`: `string`; `country`: `string`; `lat?`: `number`; `lng?`: `number`; `location?`: `string`; `postcode?`: `string`; \}; `vehicleId`: `string`; \}

###### action

`"other"` = `...`

###### amount?

`number` = `...`

###### comment

`string` = `...`

Opis wykonywanej akcji — wymagany.

###### odometerKm

`number` = `...`

###### place

\{ `city?`: `string`; `company?`: `string`; `country`: `string`; `lat?`: `number`; `lng?`: `number`; `location?`: `string`; `postcode?`: `string`; \} = `geoLocationSchema`

###### place.city?

`string` = `...`

###### place.company?

`string` = `...`

Nazwa firmy w miejscu (opcjonalnie).

###### place.country

`string` = `...`

###### place.lat?

`number` = `...`

###### place.lng?

`number` = `...`

###### place.location?

`string` = `...`

###### place.postcode?

`string` = `...`

Kod pocztowy (np. wymagany dla UK/Anglii).

###### vehicleId

`string` = `...`

#### Returns

`Promise`\<`void`\>

***

### updateVehicle()

> **updateVehicle**(`client`, `vehicleId`, `input`, `companyId`): `Promise`\<`void`\>

Defined in: [api/src/data/vehicles.ts:81](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/vehicles.ts#L81)

Edytuje pojazd. RLS: owner/dispatcher.

#### Parameters

##### client

[`TypedSupabaseClient`](../api/api/src.md#typedsupabaseclient)

##### vehicleId

`string`

##### input

###### adblueTankL?

`number` = `...`

###### comment?

`string` = `...`

###### curbWeightKg?

`number` = `...`

###### firstRegistrationDate?

`string` = `...`

###### forwarder?

`string` = `...`

###### fuelTankL?

`number` = `...`

###### heightCm?

`number` = `...`

###### inspectionExpiry?

`string` = `...`

###### insuranceExpiry?

`string` = `...`

###### insurer?

`string` = `...`

###### leasingEnd?

`string` = `...`

###### lengthCm?

`number` = `...`

###### licenseExpiry?

`string` = `...`

###### licenseNumber?

`string` = `...`

###### make?

`string` = `...`

###### maxPayloadKg?

`number` = `...`

###### model

`string` = `...`

###### registration

`string` = `...`

###### trailerRegistration?

`string` = `...`

Naczepa (jeśli auto ją posiada — #250): rejestracja + typ. Opcjonalne.

###### trailerType?

`string` = `...`

###### vehicleType

`"other"` \| `"truck"` \| `"tractor"` \| `"van"` \| `"trailer"` = `...`

###### vin?

`string` = `...`

VIN: 17 znaków, bez I/O/Q (norma ISO 3779). Walidowany tylko gdy podany.

###### widthCm?

`number` = `...`

###### year

`number` = `...`

##### companyId

`string`

#### Returns

`Promise`\<`void`\>

***

### uploadChatPhotoBinary()

> **uploadChatPhotoBinary**(`client`, `companyId`, `bytes`, `opts?`): `Promise`\<`string`\>

Defined in: [api/src/data/messages.ts:195](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/messages.ts#L195)

Upload zdjęcia do czatu — zwraca ścieżkę do `photo_path`.

#### Parameters

##### client

[`TypedSupabaseClient`](../api/api/src.md#typedsupabaseclient)

##### companyId

`string`

##### bytes

`ArrayBuffer`

##### opts?

###### mime?

`string`

#### Returns

`Promise`\<`string`\>

***

### uploadChecklistPhotoBinary()

> **uploadChecklistPhotoBinary**(`client`, `companyId`, `bytes`, `opts?`): `Promise`\<`string`\>

Defined in: [api/src/data/checklists.ts:173](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/checklists.ts#L173)

Upload zdjęcia do pozycji checklisty (np. lista Border Force) — zwraca ścieżkę.

#### Parameters

##### client

[`TypedSupabaseClient`](../api/api/src.md#typedsupabaseclient)

##### companyId

`string`

##### bytes

`ArrayBuffer`

##### opts?

###### mime?

`string`

#### Returns

`Promise`\<`string`\>

***

### uploadDamagePhoto()

> **uploadDamagePhoto**(`client`, `companyId`, `claimId`, `file`): `Promise`\<`void`\>

Defined in: [api/src/data/damagePhotos.ts:46](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/damagePhotos.ts#L46)

Upload dowodu szkody (zdjęcie/PDF polisy). Członek firmy.

#### Parameters

##### client

[`TypedSupabaseClient`](../api/api/src.md#typedsupabaseclient)

##### companyId

`string`

##### claimId

`string`

##### file

`File`

#### Returns

`Promise`\<`void`\>

***

### uploadDocument()

> **uploadDocument**(`client`, `companyId`, `file`, `input`): `Promise`\<[`DocumentMeta`](../api/api/src.md#documentmeta)\>

Defined in: [api/src/data/documents.ts:65](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/documents.ts#L65)

Wgrywa plik do bucketu `documents` pod `{companyId}/{losowy}-{nazwa}` i zapisuje
metadane. RLS na storage + tabeli wymusza, by ścieżka zaczynała się od company_id
użytkownika oraz rolę owner/dispatcher. Zwraca wpis metadanych.

#### Parameters

##### client

[`TypedSupabaseClient`](../api/api/src.md#typedsupabaseclient)

##### companyId

`string`

##### file

`File`

##### input

[`UploadDocumentInput`](../api/api/src.md#uploaddocumentinput)

#### Returns

`Promise`\<[`DocumentMeta`](../api/api/src.md#documentmeta)\>

***

### uploadExpensePhotoBinary()

> **uploadExpensePhotoBinary**(`client`, `companyId`, `bytes`, `opts?`): `Promise`\<`string`\>

Defined in: [api/src/data/driverExpenses.ts:104](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/driverExpenses.ts#L104)

Upload zdjęcia paragonu — zwraca ścieżkę do zapisania w `photo_path`.

#### Parameters

##### client

[`TypedSupabaseClient`](../api/api/src.md#typedsupabaseclient)

##### companyId

`string`

##### bytes

`ArrayBuffer`

##### opts?

###### mime?

`string`

#### Returns

`Promise`\<`string`\>

***

### uploadMyAvatar()

> **uploadMyAvatar**(`client`, `data`, `opts`): `Promise`\<`string`\>

Defined in: [api/src/data/profile.ts:15](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/profile.ts#L15)

Wgrywa avatar do własnego folderu ({uid}/avatar-<rand>.<ext>) i zwraca
publiczny URL. Losowy sufiks omija cache CDN po podmianie zdjęcia.

#### Parameters

##### client

[`TypedSupabaseClient`](../api/api/src.md#typedsupabaseclient)

##### data

`ArrayBuffer` \| `Uint8Array`\<`ArrayBufferLike`\>

##### opts

###### contentType

`string`

###### ext?

`string`

#### Returns

`Promise`\<`string`\>

***

### uploadOrderPhoto()

> **uploadOrderPhoto**(`client`, `companyId`, `orderId`, `file`, `caption?`): `Promise`\<[`OrderPhoto`](../api/api/src.md#orderphoto)\>

Defined in: [api/src/data/orderPhotos.ts:39](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/orderPhotos.ts#L39)

Wgrywa zdjęcie ładunku do bucketu `cargo-photos` pod
`{companyId}/{orderId}/{losowy}-{nazwa}` i zapisuje metadane.
Upload: każdy aktywny członek (kierowca). Zwraca wpis metadanych.

#### Parameters

##### client

[`TypedSupabaseClient`](../api/api/src.md#typedsupabaseclient)

##### companyId

`string`

##### orderId

`string`

##### file

`File`

##### caption?

`string` \| `null`

#### Returns

`Promise`\<[`OrderPhoto`](../api/api/src.md#orderphoto)\>

***

### uploadOrderPhotoBinary()

> **uploadOrderPhotoBinary**(`client`, `companyId`, `orderId`, `data`, `opts`): `Promise`\<[`OrderPhoto`](../api/api/src.md#orderphoto)\>

Defined in: [api/src/data/orderPhotos.ts:78](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/orderPhotos.ts#L78)

Wariant binarny uploadu (React Native / Expo nie ma `File`): przyjmuje dane
jako ArrayBuffer/Uint8Array + typ MIME. Reszta jak `uploadOrderPhoto`.

#### Parameters

##### client

[`TypedSupabaseClient`](../api/api/src.md#typedsupabaseclient)

##### companyId

`string`

##### orderId

`string`

##### data

`ArrayBuffer` \| `Uint8Array`\<`ArrayBufferLike`\>

##### opts

###### caption?

`string` \| `null`

###### contentType

`string`

###### ext?

`string`

###### sizeBytes?

`number`

#### Returns

`Promise`\<[`OrderPhoto`](../api/api/src.md#orderphoto)\>

***

### upsertContractor()

> **upsertContractor**(`client`, `companyId`, `input`): `Promise`\<`void`\>

Defined in: [api/src/data/contractors.ts:39](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/contractors.ts#L39)

Upsert kontrahenta po (company_id, name) — buduje rejestr organicznie przy
wystawianiu faktur/zleceń. RLS: owner/dispatcher. Pusta nazwa → no-op.

#### Parameters

##### client

[`TypedSupabaseClient`](../api/api/src.md#typedsupabaseclient)

##### companyId

`string`

##### input

[`ContractorInput`](../api/api/src.md#contractorinput)

#### Returns

`Promise`\<`void`\>

***

### upsertMyPosition()

> **upsertMyPosition**(`client`, `input`): `Promise`\<`void`\>

Defined in: [api/src/data/positions.ts:19](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/positions.ts#L19)

Zapisuje/aktualizuje pozycję zalogowanego kierowcy (RLS: własny wiersz).

#### Parameters

##### client

[`TypedSupabaseClient`](../api/api/src.md#typedsupabaseclient)

##### input

###### companyId

`string`

###### heading?

`number` \| `null`

###### lat

`number`

###### lng

`number`

###### speedKmh?

`number` \| `null`

#### Returns

`Promise`\<`void`\>

***

### upsertParkingReview()

> **upsertParkingReview**(`sb`, `input`): `Promise`\<`void`\>

Defined in: [api/src/data/parkingReviews.ts:62](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/parkingReviews.ts#L62)

Dodaje/aktualizuje ocenę zalogowanego użytkownika (unikat user+poi).

#### Parameters

##### sb

`DB`

##### input

[`ParkingReviewInput`](../api/api/src.md#parkingreviewinput)

#### Returns

`Promise`\<`void`\>

***

### vehicleToRow()

> **vehicleToRow**(`input`, `companyId`): `object`

Defined in: [api/src/data/vehicles.ts:29](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/vehicles.ts#L29)

Mapuje zwalidowany input pojazdu na wiersz tabeli (snake_case).

#### Parameters

##### input

###### adblueTankL?

`number` = `...`

###### comment?

`string` = `...`

###### curbWeightKg?

`number` = `...`

###### firstRegistrationDate?

`string` = `...`

###### forwarder?

`string` = `...`

###### fuelTankL?

`number` = `...`

###### heightCm?

`number` = `...`

###### inspectionExpiry?

`string` = `...`

###### insuranceExpiry?

`string` = `...`

###### insurer?

`string` = `...`

###### leasingEnd?

`string` = `...`

###### lengthCm?

`number` = `...`

###### licenseExpiry?

`string` = `...`

###### licenseNumber?

`string` = `...`

###### make?

`string` = `...`

###### maxPayloadKg?

`number` = `...`

###### model

`string` = `...`

###### registration

`string` = `...`

###### trailerRegistration?

`string` = `...`

Naczepa (jeśli auto ją posiada — #250): rejestracja + typ. Opcjonalne.

###### trailerType?

`string` = `...`

###### vehicleType

`"other"` \| `"truck"` \| `"tractor"` \| `"van"` \| `"trailer"` = `...`

###### vin?

`string` = `...`

VIN: 17 znaków, bez I/O/Q (norma ISO 3779). Walidowany tylko gdy podany.

###### widthCm?

`number` = `...`

###### year

`number` = `...`

##### companyId

`string`

#### Returns

`object`

##### adblue\_tank\_l

> **adblue\_tank\_l**: `number` \| `null`

##### comment

> **comment**: `string` \| `null`

##### company\_id

> **company\_id**: `string` = `companyId`

##### curb\_weight\_kg

> **curb\_weight\_kg**: `number` \| `null`

##### first\_registration\_date

> **first\_registration\_date**: `string` \| `null`

##### forwarder

> **forwarder**: `string` \| `null`

##### fuel\_tank\_l

> **fuel\_tank\_l**: `number` \| `null`

##### height\_cm

> **height\_cm**: `number` \| `null`

##### inspection\_expiry

> **inspection\_expiry**: `string` \| `null`

##### insurance\_expiry

> **insurance\_expiry**: `string` \| `null`

##### insurer

> **insurer**: `string` \| `null`

##### leasing\_end

> **leasing\_end**: `string` \| `null`

##### length\_cm

> **length\_cm**: `number` \| `null`

##### license\_expiry

> **license\_expiry**: `string` \| `null`

##### license\_number

> **license\_number**: `string` \| `null`

##### make

> **make**: `string` \| `null`

##### max\_payload\_kg

> **max\_payload\_kg**: `number` \| `null`

##### model

> **model**: `string` = `input.model`

##### registration

> **registration**: `string` = `input.registration`

##### vehicle\_type

> **vehicle\_type**: `"other"` \| `"truck"` \| `"tractor"` \| `"van"` \| `"trailer"` = `input.vehicleType`

##### vin

> **vin**: `string` \| `null`

##### width\_cm

> **width\_cm**: `number` \| `null`

##### year

> **year**: `number` = `input.year`

***

### wipeCompanyData()

> **wipeCompanyData**(`client`, `companyId`, `confirmName`): `Promise`\<`Record`\<`string`, `number`\>\>

Defined in: [api/src/data/companies.ts:82](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/api/src/data/companies.ts#L82)

Czyszczenie danych firmy (strefa niebezpieczna, #259) — RPC `company_wipe_data`:
tylko owner, potwierdzenie DOKŁADNĄ nazwą firmy; zostają firma/zespół/audyt/tokeny push.
Zwraca liczbę usuniętych wierszy per tabela (wpis trafia też do audit_log).

#### Parameters

##### client

[`TypedSupabaseClient`](../api/api/src.md#typedsupabaseclient)

##### companyId

`string`

##### confirmName

`string`

#### Returns

`Promise`\<`Record`\<`string`, `number`\>\>
