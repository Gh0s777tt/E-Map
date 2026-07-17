[**e-logistic**](../index.md)

***

[e-logistic](../api/index.md) / core/src

# core/src

## Interfaces

### AetrInput

Defined in: [core/src/aetr.ts:31](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/aetr.ts#L31)

#### Properties

##### breakTakenMin

> **breakTakenMin**: `number`

Defined in: [core/src/aetr.ts:35](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/aetr.ts#L35)

Część przerwy już wykorzystana w tym cyklu (0 lub ≥15) [min].

##### continuousDrivingMin

> **continuousDrivingMin**: `number`

Defined in: [core/src/aetr.ts:33](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/aetr.ts#L33)

Jazda ciągła od ostatniej kwalifikowanej przerwy [min].

##### dailyDrivingMin

> **dailyDrivingMin**: `number`

Defined in: [core/src/aetr.ts:37](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/aetr.ts#L37)

Jazda w bieżącej dobie [min].

##### extendedDrivesUsed

> **extendedDrivesUsed**: `number`

Defined in: [core/src/aetr.ts:43](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/aetr.ts#L43)

Wykorzystane wydłużenia do 10 h w tym tygodniu (0–2).

##### prevWeekDrivingMin

> **prevWeekDrivingMin**: `number`

Defined in: [core/src/aetr.ts:41](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/aetr.ts#L41)

Jazda w poprzednim tygodniu [min].

##### reducedRestsUsed

> **reducedRestsUsed**: `number`

Defined in: [core/src/aetr.ts:45](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/aetr.ts#L45)

Wykorzystane skrócone odpoczynki dobowe 9 h od ost. tygodniowego (0–3).

##### weeklyDrivingMin

> **weeklyDrivingMin**: `number`

Defined in: [core/src/aetr.ts:39](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/aetr.ts#L39)

Jazda w bieżącym tygodniu (pn 00:00 – nd 24:00) [min].

***

### AetrStatus

Defined in: [core/src/aetr.ts:48](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/aetr.ts#L48)

#### Properties

##### alerts

> **alerts**: `string`[]

Defined in: [core/src/aetr.ts:66](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/aetr.ts#L66)

Naruszenia / ostrzeżenia (puste = OK).

##### dailyRemainingExtendedMin

> **dailyRemainingExtendedMin**: `number` \| `null`

Defined in: [core/src/aetr.ts:56](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/aetr.ts#L56)

Pozostała jazda w dobie przy wydłużeniu do 10 h (null gdy brak kredytu).

##### dailyRemainingMin

> **dailyRemainingMin**: `number`

Defined in: [core/src/aetr.ts:54](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/aetr.ts#L54)

Pozostała jazda w dobie przy limicie 9 h [min].

##### extendedLeft

> **extendedLeft**: `number`

Defined in: [core/src/aetr.ts:58](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/aetr.ts#L58)

Pozostałe wydłużenia do 10 h w tym tygodniu (0–2).

##### reducedRestsLeft

> **reducedRestsLeft**: `number`

Defined in: [core/src/aetr.ts:64](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/aetr.ts#L64)

Pozostałe skrócone odpoczynki dobowe 9 h (0–3).

##### requiredBreakMin

> **requiredBreakMin**: `number`

Defined in: [core/src/aetr.ts:52](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/aetr.ts#L52)

Wymagana najbliższa przerwa [min]: 45, albo 30 po wykorzystanej 15.

##### toBreakMin

> **toBreakMin**: `number`

Defined in: [core/src/aetr.ts:50](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/aetr.ts#L50)

Ile jazdy zostało do wymaganej przerwy [min] (0 = przerwa TERAZ).

##### twoWeekRemainingMin

> **twoWeekRemainingMin**: `number`

Defined in: [core/src/aetr.ts:62](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/aetr.ts#L62)

Pozostała jazda w dwutygodniu [min].

##### weeklyRemainingMin

> **weeklyRemainingMin**: `number`

Defined in: [core/src/aetr.ts:60](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/aetr.ts#L60)

Pozostała jazda w tym tygodniu [min] (uwzględnia też limit 90 h/2 tyg.).

***

### Badge

Defined in: [core/src/gamification.ts:27](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/gamification.ts#L27)

#### Properties

##### key

> **key**: `string`

Defined in: [core/src/gamification.ts:28](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/gamification.ts#L28)

##### nextThreshold

> **nextThreshold**: `number` \| `null`

Defined in: [core/src/gamification.ts:35](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/gamification.ts#L35)

##### progress

> **progress**: `number`

Defined in: [core/src/gamification.ts:32](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/gamification.ts#L32)

Postęp do kolejnego progu (0–1); 1 gdy złota (maks).

##### tier

> **tier**: `"bronze"` \| `"silver"` \| `"gold"`

Defined in: [core/src/gamification.ts:30](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/gamification.ts#L30)

Poziom brązowy/srebrny/złoty (progresja tej samej odznaki).

##### value

> **value**: `number`

Defined in: [core/src/gamification.ts:34](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/gamification.ts#L34)

Wartość bieżąca i próg kolejnego tieru (do UI).

***

### BuildJourneysInput

Defined in: [core/src/journeys.ts:61](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/journeys.ts#L61)

#### Properties

##### adblue

> **adblue**: [`JourneyFuelEntry`](../api/core/src.md#journeyfuelentry)[]

Defined in: [core/src/journeys.ts:64](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/journeys.ts#L64)

##### fuel

> **fuel**: [`JourneyFuelEntry`](../api/core/src.md#journeyfuelentry)[]

Defined in: [core/src/journeys.ts:63](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/journeys.ts#L63)

##### ratePerKmByVehicle?

> `optional` **ratePerKmByVehicle?**: `Record`\<`string`, `number`\>

Defined in: [core/src/journeys.ts:66](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/journeys.ts#L66)

Stawka €/km per pojazd (do przychodu/zysku).

##### trips

> **trips**: [`JourneyTripEvent`](../api/core/src.md#journeytripevent)[]

Defined in: [core/src/journeys.ts:62](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/journeys.ts#L62)

***

### ChecklistAnswer

Defined in: [core/src/checklists.ts:21](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/checklists.ts#L21)

#### Properties

##### photo?

> `optional` **photo?**: `string`

Defined in: [core/src/checklists.ts:25](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/checklists.ts#L25)

##### time?

> `optional` **time?**: `string`

Defined in: [core/src/checklists.ts:24](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/checklists.ts#L24)

##### value

> **value**: `boolean` \| `string`[]

Defined in: [core/src/checklists.ts:23](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/checklists.ts#L23)

yesno → boolean; multi → wybrane opcje.

***

### ChecklistItem

Defined in: [core/src/checklists.ts:9](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/checklists.ts#L9)

#### Properties

##### key

> **key**: `string`

Defined in: [core/src/checklists.ts:10](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/checklists.ts#L10)

##### label

> **label**: `string`

Defined in: [core/src/checklists.ts:11](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/checklists.ts#L11)

##### options?

> `optional` **options?**: `string`[]

Defined in: [core/src/checklists.ts:14](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/checklists.ts#L14)

Opcje dla `multi` (wielokrotny wybór).

##### photo?

> `optional` **photo?**: `boolean`

Defined in: [core/src/checklists.ts:16](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/checklists.ts#L16)

Pozwól dołączyć/zrobić zdjęcie do tej pozycji.

##### time?

> `optional` **time?**: `boolean`

Defined in: [core/src/checklists.ts:18](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/checklists.ts#L18)

Pole godziny (HH:MM, data zawsze automatyczna z chwili zapisu).

##### type

> **type**: [`ChecklistItemType`](../api/core/src.md#checklistitemtype-1)

Defined in: [core/src/checklists.ts:12](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/checklists.ts#L12)

***

### ClientCo2

Defined in: [core/src/co2.ts:65](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/co2.ts#L65)

#### Properties

##### client

> **client**: `string`

Defined in: [core/src/co2.ts:66](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/co2.ts#L66)

##### co2Kg

> **co2Kg**: `number`

Defined in: [core/src/co2.ts:68](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/co2.ts#L68)

##### liters

> **liters**: `number`

Defined in: [core/src/co2.ts:67](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/co2.ts#L67)

***

### ClientProfit

Defined in: [core/src/profitability.ts:21](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/profitability.ts#L21)

#### Properties

##### client

> **client**: `string`

Defined in: [core/src/profitability.ts:22](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/profitability.ts#L22)

##### costEur

> **costEur**: `number`

Defined in: [core/src/profitability.ts:26](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/profitability.ts#L26)

Koszt przypisany (€) — patrz model atrybucji.

##### marginPct

> **marginPct**: `number` \| `null`

Defined in: [core/src/profitability.ts:29](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/profitability.ts#L29)

Marża = zysk / przychód × 100. null gdy przychód = 0.

##### orders

> **orders**: `number`

Defined in: [core/src/profitability.ts:23](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/profitability.ts#L23)

##### profitEur

> **profitEur**: `number`

Defined in: [core/src/profitability.ts:27](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/profitability.ts#L27)

##### revenueEur

> **revenueEur**: `number`

Defined in: [core/src/profitability.ts:24](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/profitability.ts#L24)

***

### ClientProfitability

Defined in: [core/src/profitability.ts:32](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/profitability.ts#L32)

#### Properties

##### clients

> **clients**: [`ClientProfit`](../api/core/src.md#clientprofit)[]

Defined in: [core/src/profitability.ts:33](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/profitability.ts#L33)

##### noVehicleRevenueEur

> **noVehicleRevenueEur**: `number`

Defined in: [core/src/profitability.ts:40](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/profitability.ts#L40)

Przychód ze zleceń bez pojazdu — koszt nieprzypisywalny (margines zawyżony).

##### totalAttributedCostEur

> **totalAttributedCostEur**: `number`

Defined in: [core/src/profitability.ts:35](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/profitability.ts#L35)

##### totalProfitEur

> **totalProfitEur**: `number`

Defined in: [core/src/profitability.ts:36](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/profitability.ts#L36)

##### totalRevenueEur

> **totalRevenueEur**: `number`

Defined in: [core/src/profitability.ts:34](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/profitability.ts#L34)

##### unattributedCostEur

> **unattributedCostEur**: `number`

Defined in: [core/src/profitability.ts:38](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/profitability.ts#L38)

Koszt paliwa pojazdów bez zrealizowanego przychodu EUR — nie da się przypisać.

***

### ClientTrendPoint

Defined in: [core/src/profitability.ts:125](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/profitability.ts#L125)

#### Properties

##### costEur

> **costEur**: `number`

Defined in: [core/src/profitability.ts:129](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/profitability.ts#L129)

##### marginPct

> **marginPct**: `number` \| `null`

Defined in: [core/src/profitability.ts:131](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/profitability.ts#L131)

##### month

> **month**: `string`

Defined in: [core/src/profitability.ts:127](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/profitability.ts#L127)

Miesiąc w formacie `YYYY-MM`.

##### profitEur

> **profitEur**: `number`

Defined in: [core/src/profitability.ts:130](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/profitability.ts#L130)

##### revenueEur

> **revenueEur**: `number`

Defined in: [core/src/profitability.ts:128](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/profitability.ts#L128)

***

### Co2OrderEntry

Defined in: [core/src/co2.ts:57](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/co2.ts#L57)

#### Properties

##### currency

> **currency**: `string`

Defined in: [core/src/co2.ts:61](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/co2.ts#L61)

##### price

> **price**: `number` \| `null`

Defined in: [core/src/co2.ts:60](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/co2.ts#L60)

##### shipper

> **shipper**: `string` \| `null`

Defined in: [core/src/co2.ts:58](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/co2.ts#L58)

##### status

> **status**: `string`

Defined in: [core/src/co2.ts:62](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/co2.ts#L62)

##### vehicleId

> **vehicleId**: `string` \| `null`

Defined in: [core/src/co2.ts:59](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/co2.ts#L59)

***

### ConsumptionOutlier

Defined in: [core/src/insights.ts:35](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/insights.ts#L35)

#### Properties

##### avgConsumption

> **avgConsumption**: `number`

Defined in: [core/src/insights.ts:37](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/insights.ts#L37)

##### extraCost

> **extraCost**: `number`

Defined in: [core/src/insights.ts:43](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/insights.ts#L43)

Szacowany dodatkowy koszt paliwa w okresie [waluta].

##### fleetMedian

> **fleetMedian**: `number`

Defined in: [core/src/insights.ts:39](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/insights.ts#L39)

Mediana spalania floty.

##### overMedianPct

> **overMedianPct**: `number`

Defined in: [core/src/insights.ts:41](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/insights.ts#L41)

O ile % powyżej mediany.

##### registration

> **registration**: `string`

Defined in: [core/src/insights.ts:36](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/insights.ts#L36)

***

### ConsumptionSegment

Defined in: [core/src/billing.ts:18](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/billing.ts#L18)

#### Properties

##### distanceKm

> **distanceKm**: `number`

Defined in: [core/src/billing.ts:21](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/billing.ts#L21)

##### fromKm

> **fromKm**: `number`

Defined in: [core/src/billing.ts:19](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/billing.ts#L19)

##### liters

> **liters**: `number`

Defined in: [core/src/billing.ts:22](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/billing.ts#L22)

##### lPer100km

> **lPer100km**: `number`

Defined in: [core/src/billing.ts:23](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/billing.ts#L23)

##### toKm

> **toKm**: `number`

Defined in: [core/src/billing.ts:20](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/billing.ts#L20)

***

### CostCategoryTotal

Defined in: [core/src/vehicleCosts.ts:38](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/vehicleCosts.ts#L38)

#### Properties

##### amountEur

> **amountEur**: `number`

Defined in: [core/src/vehicleCosts.ts:41](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/vehicleCosts.ts#L41)

##### category

> **category**: `"other"` \| `"parking"` \| `"repair"` \| `"leasing"` \| `"insurance"` \| `"tax"` \| `"fine"` \| `"tires"`

Defined in: [core/src/vehicleCosts.ts:39](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/vehicleCosts.ts#L39)

##### label

> **label**: `string`

Defined in: [core/src/vehicleCosts.ts:40](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/vehicleCosts.ts#L40)

***

### CostEntry

Defined in: [core/src/accounting.ts:75](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/accounting.ts#L75)

#### Properties

##### amount

> **amount**: `number`

Defined in: [core/src/accounting.ts:77](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/accounting.ts#L77)

##### category

> **category**: `string`

Defined in: [core/src/accounting.ts:76](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/accounting.ts#L76)

***

### CostGroup

Defined in: [core/src/accounting.ts:80](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/accounting.ts#L80)

#### Properties

##### amount

> **amount**: `number`

Defined in: [core/src/accounting.ts:82](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/accounting.ts#L82)

##### category

> **category**: `string`

Defined in: [core/src/accounting.ts:81](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/accounting.ts#L81)

##### count

> **count**: `number`

Defined in: [core/src/accounting.ts:83](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/accounting.ts#L83)

***

### CostRegister

Defined in: [core/src/accounting.ts:86](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/accounting.ts#L86)

#### Properties

##### count

> **count**: `number`

Defined in: [core/src/accounting.ts:89](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/accounting.ts#L89)

##### groups

> **groups**: [`CostGroup`](../api/core/src.md#costgroup)[]

Defined in: [core/src/accounting.ts:87](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/accounting.ts#L87)

##### total

> **total**: `number`

Defined in: [core/src/accounting.ts:88](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/accounting.ts#L88)

***

### DamageClaimEntry

Defined in: [core/src/damageClaims.ts:46](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/damageClaims.ts#L46)

#### Properties

##### cost

> **cost**: `number` \| `null`

Defined in: [core/src/damageClaims.ts:48](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/damageClaims.ts#L48)

##### currency

> **currency**: `string`

Defined in: [core/src/damageClaims.ts:49](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/damageClaims.ts#L49)

##### status

> **status**: `"in_progress"` \| `"reported"` \| `"repaired"` \| `"closed"` \| `"rejected"`

Defined in: [core/src/damageClaims.ts:47](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/damageClaims.ts#L47)

***

### DamageSummary

Defined in: [core/src/damageClaims.ts:52](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/damageClaims.ts#L52)

#### Properties

##### costByCurrency

> **costByCurrency**: `object`[]

Defined in: [core/src/damageClaims.ts:57](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/damageClaims.ts#L57)

Suma kosztów per waluta (tylko pozycje z kwotą), malejąco.

###### amount

> **amount**: `number`

###### currency

> **currency**: `string`

##### open

> **open**: `number`

Defined in: [core/src/damageClaims.ts:55](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/damageClaims.ts#L55)

Zgłoszone + w likwidacji.

##### total

> **total**: `number`

Defined in: [core/src/damageClaims.ts:53](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/damageClaims.ts#L53)

***

### DddActivityChange

Defined in: [core/src/ddd.ts:16](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/ddd.ts#L16)

#### Properties

##### activity

> **activity**: [`DddActivity`](../api/core/src.md#dddactivity)

Defined in: [core/src/ddd.ts:19](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/ddd.ts#L19)

##### cardAbsent

> **cardAbsent**: `boolean`

Defined in: [core/src/ddd.ts:23](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/ddd.ts#L23)

Karta wyjęta w tym okresie (wpis manualny / brak karty).

##### minute

> **minute**: `number`

Defined in: [core/src/ddd.ts:18](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/ddd.ts#L18)

Minuta doby UTC (0–1439).

##### slot

> **slot**: `0` \| `1`

Defined in: [core/src/ddd.ts:21](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/ddd.ts#L21)

Slot karty: 0 = kierowca, 1 = drugi kierowca.

***

### DddDay

Defined in: [core/src/ddd.ts:26](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/ddd.ts#L26)

#### Properties

##### changes

> **changes**: [`DddActivityChange`](../api/core/src.md#dddactivitychange)[]

Defined in: [core/src/ddd.ts:31](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/ddd.ts#L31)

##### date

> **date**: `string`

Defined in: [core/src/ddd.ts:28](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/ddd.ts#L28)

Data doby (YYYY-MM-DD, UTC).

##### distanceKm

> **distanceKm**: `number`

Defined in: [core/src/ddd.ts:30](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/ddd.ts#L30)

Dystans dobowy z licznika karty [km].

##### totals

> **totals**: `Record`\<[`DddActivity`](../api/core/src.md#dddactivity), `number`\>

Defined in: [core/src/ddd.ts:33](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/ddd.ts#L33)

Sumy minut per aktywność (do końca doby).

##### violations

> **violations**: `string`[]

Defined in: [core/src/ddd.ts:35](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/ddd.ts#L35)

Naruszenia wykryte w tej dobie.

***

### DddParseResult

Defined in: [core/src/ddd.ts:38](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/ddd.ts#L38)

#### Properties

##### days

> **days**: [`DddDay`](../api/core/src.md#dddday)[]

Defined in: [core/src/ddd.ts:41](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/ddd.ts#L41)

##### generation

> **generation**: `2` \| `1` \| `null`

Defined in: [core/src/ddd.ts:40](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/ddd.ts#L40)

##### holderName

> **holderName**: `string` \| `null`

Defined in: [core/src/ddd.ts:39](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/ddd.ts#L39)

##### warnings

> **warnings**: `string`[]

Defined in: [core/src/ddd.ts:43](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/ddd.ts#L43)

Ostrzeżenia parsera (np. ucięty bufor).

***

### DietResult

Defined in: [core/src/perDiem.ts:30](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/perDiem.ts#L30)

#### Properties

##### amount

> **amount**: `number`

Defined in: [core/src/perDiem.ts:42](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/perDiem.ts#L42)

Kwota diety: doby × stawka.

##### currency

> **currency**: `string`

Defined in: [core/src/perDiem.ts:43](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/perDiem.ts#L43)

##### days

> **days**: `number`

Defined in: [core/src/perDiem.ts:40](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/perDiem.ts#L40)

Należne doby łącznie (pełne + ułamek).

##### destination

> **destination**: `string`

Defined in: [core/src/perDiem.ts:31](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/perDiem.ts#L31)

##### fraction

> **fraction**: `number`

Defined in: [core/src/perDiem.ts:38](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/perDiem.ts#L38)

Ułamek doby za część niepełną (0, 1/3, 1/2, 1).

##### fullDays

> **fullDays**: `number`

Defined in: [core/src/perDiem.ts:34](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/perDiem.ts#L34)

Pełne doby podróży.

##### mode

> **mode**: [`DietMode`](../api/core/src.md#dietmode)

Defined in: [core/src/perDiem.ts:32](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/perDiem.ts#L32)

##### remainderHours

> **remainderHours**: `number`

Defined in: [core/src/perDiem.ts:36](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/perDiem.ts#L36)

Godziny niepełnej doby.

***

### DietTrip

Defined in: [core/src/perDiem.ts:17](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/perDiem.ts#L17)

#### Properties

##### currency

> **currency**: `string`

Defined in: [core/src/perDiem.ts:27](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/perDiem.ts#L27)

Waluta stawki (np. PLN, EUR).

##### dailyRate

> **dailyRate**: `number`

Defined in: [core/src/perDiem.ts:25](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/perDiem.ts#L25)

Stawka diety za dobę (w walucie kraju).

##### destination

> **destination**: `string`

Defined in: [core/src/perDiem.ts:20](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/perDiem.ts#L20)

Cel / kraj podróży (opis).

##### hours

> **hours**: `number`

Defined in: [core/src/perDiem.ts:23](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/perDiem.ts#L23)

Łączny czas podróży w godzinach (≥ 0).

##### id?

> `optional` **id?**: `string`

Defined in: [core/src/perDiem.ts:18](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/perDiem.ts#L18)

##### mode

> **mode**: [`DietMode`](../api/core/src.md#dietmode)

Defined in: [core/src/perDiem.ts:21](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/perDiem.ts#L21)

***

### DriverSettlementInput

Defined in: [core/src/driverSettlement.ts:39](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/driverSettlement.ts#L39)

#### Properties

##### days

> **days**: `number`

Defined in: [core/src/driverSettlement.ts:40](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/driverSettlement.ts#L40)

##### deductions?

> `optional` **deductions?**: `number`

Defined in: [core/src/driverSettlement.ts:49](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/driverSettlement.ts#L49)

Potrącenia/zaliczki pomniejszające BALANS.

##### docBonusOverride?

> `optional` **docBonusOverride?**: `number` \| `null`

Defined in: [core/src/driverSettlement.ts:46](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/driverSettlement.ts#L46)

Korekta premii dokumentacyjnej — domyślnie pełna kwota proporcjonalna do dni.

##### hotels?

> `optional` **hotels?**: `number`

Defined in: [core/src/driverSettlement.ts:47](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/driverSettlement.ts#L47)

##### normBonus?

> `optional` **normBonus?**: `number`

Defined in: [core/src/driverSettlement.ts:44](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/driverSettlement.ts#L44)

Premia „norma" — kwota uznaniowa (np. za spalanie poniżej normy).

##### settings

> **settings**: [`SettlementSettings`](../api/core/src.md#settlementsettings)

Defined in: [core/src/driverSettlement.ts:42](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/driverSettlement.ts#L42)

##### weeks

> **weeks**: [`SettlementWeek`](../api/core/src.md#settlementweek)[]

Defined in: [core/src/driverSettlement.ts:41](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/driverSettlement.ts#L41)

***

### DriverSettlementResult

Defined in: [core/src/driverSettlement.ts:52](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/driverSettlement.ts#L52)

#### Properties

##### balance

> **balance**: `number`

Defined in: [core/src/driverSettlement.ts:63](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/driverSettlement.ts#L63)

##### base

> **base**: `number`

Defined in: [core/src/driverSettlement.ts:53](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/driverSettlement.ts#L53)

##### bonusTotal

> **bonusTotal**: `number`

Defined in: [core/src/driverSettlement.ts:58](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/driverSettlement.ts#L58)

##### deductions

> **deductions**: `number`

Defined in: [core/src/driverSettlement.ts:62](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/driverSettlement.ts#L62)

##### docBonus

> **docBonus**: `number`

Defined in: [core/src/driverSettlement.ts:54](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/driverSettlement.ts#L54)

##### hotels

> **hotels**: `number`

Defined in: [core/src/driverSettlement.ts:60](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/driverSettlement.ts#L60)

##### insurance

> **insurance**: `number`

Defined in: [core/src/driverSettlement.ts:57](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/driverSettlement.ts#L57)

##### kmTotal

> **kmTotal**: `number`

Defined in: [core/src/driverSettlement.ts:64](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/driverSettlement.ts#L64)

##### normBonus

> **normBonus**: `number`

Defined in: [core/src/driverSettlement.ts:55](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/driverSettlement.ts#L55)

##### phone

> **phone**: `number`

Defined in: [core/src/driverSettlement.ts:59](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/driverSettlement.ts#L59)

##### total

> **total**: `number`

Defined in: [core/src/driverSettlement.ts:61](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/driverSettlement.ts#L61)

##### weekBonuses

> **weekBonuses**: `number`[]

Defined in: [core/src/driverSettlement.ts:56](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/driverSettlement.ts#L56)

***

### EcoPick

Defined in: [core/src/ecoRoute.ts:59](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/ecoRoute.ts#L59)

#### Properties

##### durationMin

> **durationMin**: `number` \| `null`

Defined in: [core/src/ecoRoute.ts:62](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/ecoRoute.ts#L62)

##### estimate

> **estimate**: [`RouteFuelEstimate`](../api/core/src.md#routefuelestimate)

Defined in: [core/src/ecoRoute.ts:61](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/ecoRoute.ts#L61)

##### extraMinutes

> **extraMinutes**: `number`

Defined in: [core/src/ecoRoute.ts:66](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/ecoRoute.ts#L66)

Dłużej niż najszybszy o tyle minut (0/ujemne = nie wolniej).

##### label

> **label**: `string`

Defined in: [core/src/ecoRoute.ts:60](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/ecoRoute.ts#L60)

##### savingsVsFastest

> **savingsVsFastest**: `number`

Defined in: [core/src/ecoRoute.ts:64](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/ecoRoute.ts#L64)

Oszczędność kosztu vs. wariant najszybszy [waluta] (0 gdy sam jest najszybszy).

***

### ExpiryStatus

Defined in: [core/src/expiry.ts:5](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/expiry.ts#L5)

#### Properties

##### daysLeft

> **daysLeft**: `number`

Defined in: [core/src/expiry.ts:6](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/expiry.ts#L6)

##### level

> **level**: [`ExpiryLevel`](../api/core/src.md#expirylevel)

Defined in: [core/src/expiry.ts:7](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/expiry.ts#L7)

***

### FakturowniaInvoice

Defined in: [core/src/fakturownia.ts:14](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/fakturownia.ts#L14)

#### Properties

##### buyer\_name?

> `optional` **buyer\_name?**: `string`

Defined in: [core/src/fakturownia.ts:26](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/fakturownia.ts#L26)

##### buyer\_street?

> `optional` **buyer\_street?**: `string`

Defined in: [core/src/fakturownia.ts:28](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/fakturownia.ts#L28)

##### buyer\_tax\_no?

> `optional` **buyer\_tax\_no?**: `string`

Defined in: [core/src/fakturownia.ts:27](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/fakturownia.ts#L27)

##### currency

> **currency**: `string`

Defined in: [core/src/fakturownia.ts:21](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/fakturownia.ts#L21)

##### issue\_date

> **issue\_date**: `string`

Defined in: [core/src/fakturownia.ts:18](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/fakturownia.ts#L18)

##### kind

> **kind**: `"vat"`

Defined in: [core/src/fakturownia.ts:15](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/fakturownia.ts#L15)

##### number

> **number**: `null`

Defined in: [core/src/fakturownia.ts:17](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/fakturownia.ts#L17)

null = numer nadaje Fakturownia (legalna numeracja).

##### payment\_to?

> `optional` **payment\_to?**: `string`

Defined in: [core/src/fakturownia.ts:20](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/fakturownia.ts#L20)

##### positions

> **positions**: [`FakturowniaPosition`](../api/core/src.md#fakturowniaposition)[]

Defined in: [core/src/fakturownia.ts:29](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/fakturownia.ts#L29)

##### sell\_date

> **sell\_date**: `string`

Defined in: [core/src/fakturownia.ts:19](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/fakturownia.ts#L19)

##### seller\_bank?

> `optional` **seller\_bank?**: `string`

Defined in: [core/src/fakturownia.ts:24](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/fakturownia.ts#L24)

##### seller\_bank\_account?

> `optional` **seller\_bank\_account?**: `string`

Defined in: [core/src/fakturownia.ts:25](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/fakturownia.ts#L25)

##### seller\_name?

> `optional` **seller\_name?**: `string`

Defined in: [core/src/fakturownia.ts:22](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/fakturownia.ts#L22)

##### seller\_tax\_no?

> `optional` **seller\_tax\_no?**: `string`

Defined in: [core/src/fakturownia.ts:23](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/fakturownia.ts#L23)

***

### FakturowniaPosition

Defined in: [core/src/fakturownia.ts:7](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/fakturownia.ts#L7)

Mapowanie faktury E-Logistic → ładunek API Fakturowni (`POST /invoices.json`,
obiekt `invoice`). Funkcja czysta — `api_token` dokleja warstwa serwerowa.
Pozycje: `total_price_gross` = wartość brutto linii, `tax` = stawka VAT (%).

#### Properties

##### name

> **name**: `string`

Defined in: [core/src/fakturownia.ts:8](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/fakturownia.ts#L8)

##### quantity

> **quantity**: `number`

Defined in: [core/src/fakturownia.ts:9](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/fakturownia.ts#L9)

##### tax

> **tax**: `number`

Defined in: [core/src/fakturownia.ts:11](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/fakturownia.ts#L11)

##### total\_price\_gross

> **total\_price\_gross**: `number`

Defined in: [core/src/fakturownia.ts:10](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/fakturownia.ts#L10)

***

### FleetAlert

Defined in: [core/src/alerts.ts:11](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/alerts.ts#L11)

#### Properties

##### key

> **key**: `string`

Defined in: [core/src/alerts.ts:12](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/alerts.ts#L12)

##### kind

> **kind**: [`AlertKind`](../api/core/src.md#alertkind)

Defined in: [core/src/alerts.ts:14](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/alerts.ts#L14)

##### label

> **label**: `string`

Defined in: [core/src/alerts.ts:16](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/alerts.ts#L16)

Czego dotyczy (nazwa klienta / rejestracja / miesiąc) — do złożenia komunikatu w UI.

##### severity

> **severity**: [`AlertSeverity`](../api/core/src.md#alertseverity)

Defined in: [core/src/alerts.ts:13](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/alerts.ts#L13)

##### value

> **value**: `number`

Defined in: [core/src/alerts.ts:18](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/alerts.ts#L18)

Wartość liczbowa: marża %, liczba anomalii, % wzrostu kosztu.

***

### FleetAlertInput

Defined in: [core/src/alerts.ts:21](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/alerts.ts#L21)

#### Properties

##### anomalyVehicles?

> `optional` **anomalyVehicles?**: `object`[]

Defined in: [core/src/alerts.ts:23](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/alerts.ts#L23)

###### anomalies

> **anomalies**: `number`

###### registration

> **registration**: `string`

##### clients?

> `optional` **clients?**: `object`[]

Defined in: [core/src/alerts.ts:22](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/alerts.ts#L22)

###### client

> **client**: `string`

###### marginPct

> **marginPct**: `number` \| `null`

###### revenueEur

> **revenueEur**: `number`

##### fuelCostByMonth?

> `optional` **fuelCostByMonth?**: `object`[]

Defined in: [core/src/alerts.ts:25](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/alerts.ts#L25)

Koszt paliwa per miesiąc, posortowany rosnąco (ostatni = bieżący).

###### cost

> **cost**: `number`

###### month

> **month**: `string`

##### fuelSpikePct?

> `optional` **fuelSpikePct?**: `number`

Defined in: [core/src/alerts.ts:29](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/alerts.ts#L29)

Próg skoku kosztu paliwa m/m (%, domyślnie 30).

##### lowMarginThresholdPct?

> `optional` **lowMarginThresholdPct?**: `number`

Defined in: [core/src/alerts.ts:27](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/alerts.ts#L27)

Próg „niskiej" marży (%, domyślnie 5). Poniżej 0 = krytyczna (ujemna).

***

### FleetInsights

Defined in: [core/src/insights.ts:46](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/insights.ts#L46)

#### Properties

##### fuelTrend

> **fuelTrend**: [`TrendResult`](../api/core/src.md#trendresult) \| `null`

Defined in: [core/src/insights.ts:47](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/insights.ts#L47)

##### outliers

> **outliers**: [`ConsumptionOutlier`](../api/core/src.md#consumptionoutlier)[]

Defined in: [core/src/insights.ts:48](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/insights.ts#L48)

##### potentialSavings

> **potentialSavings**: `number`

Defined in: [core/src/insights.ts:50](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/insights.ts#L50)

Suma szacowanych oszczędności, gdyby odstający zeszli do mediany.

***

### FleetPnl

Defined in: [core/src/vehicleCosts.ts:71](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/vehicleCosts.ts#L71)

#### Properties

##### fuelEur

> **fuelEur**: `number`

Defined in: [core/src/vehicleCosts.ts:73](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/vehicleCosts.ts#L73)

##### marginPct

> **marginPct**: `number` \| `null`

Defined in: [core/src/vehicleCosts.ts:77](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/vehicleCosts.ts#L77)

##### otherCostEur

> **otherCostEur**: `number`

Defined in: [core/src/vehicleCosts.ts:74](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/vehicleCosts.ts#L74)

##### profitEur

> **profitEur**: `number`

Defined in: [core/src/vehicleCosts.ts:76](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/vehicleCosts.ts#L76)

##### revenueEur

> **revenueEur**: `number`

Defined in: [core/src/vehicleCosts.ts:72](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/vehicleCosts.ts#L72)

##### totalCostEur

> **totalCostEur**: `number`

Defined in: [core/src/vehicleCosts.ts:75](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/vehicleCosts.ts#L75)

***

### FleetPnlOrder

Defined in: [core/src/vehiclePnl.ts:42](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/vehiclePnl.ts#L42)

#### Properties

##### currency

> **currency**: `string`

Defined in: [core/src/vehiclePnl.ts:45](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/vehiclePnl.ts#L45)

##### price

> **price**: `number` \| `null`

Defined in: [core/src/vehiclePnl.ts:44](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/vehiclePnl.ts#L44)

##### status

> **status**: `string`

Defined in: [core/src/vehiclePnl.ts:46](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/vehiclePnl.ts#L46)

##### vehicleId

> **vehicleId**: `string` \| `null`

Defined in: [core/src/vehiclePnl.ts:43](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/vehiclePnl.ts#L43)

***

### FleetStatusEvent

Defined in: [core/src/fleet.ts:36](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/fleet.ts#L36)

#### Properties

##### action

> **action**: `string`

Defined in: [core/src/fleet.ts:37](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/fleet.ts#L37)

##### country

> **country**: `string` \| `null`

Defined in: [core/src/fleet.ts:39](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/fleet.ts#L39)

##### createdAt

> **createdAt**: `string`

Defined in: [core/src/fleet.ts:40](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/fleet.ts#L40)

##### location

> **location**: `string` \| `null`

Defined in: [core/src/fleet.ts:38](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/fleet.ts#L38)

***

### FleetStatusEventInput

Defined in: [core/src/fleet.ts:19](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/fleet.ts#L19)

#### Properties

##### action

> **action**: `string`

Defined in: [core/src/fleet.ts:21](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/fleet.ts#L21)

##### country

> **country**: `string` \| `null`

Defined in: [core/src/fleet.ts:23](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/fleet.ts#L23)

##### createdAt

> **createdAt**: `string`

Defined in: [core/src/fleet.ts:24](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/fleet.ts#L24)

##### location

> **location**: `string` \| `null`

Defined in: [core/src/fleet.ts:22](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/fleet.ts#L22)

##### vehicleId

> **vehicleId**: `string`

Defined in: [core/src/fleet.ts:20](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/fleet.ts#L20)

***

### FleetStatusOrder

Defined in: [core/src/fleet.ts:27](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/fleet.ts#L27)

#### Properties

##### assignedTo

> **assignedTo**: `string` \| `null`

Defined in: [core/src/fleet.ts:31](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/fleet.ts#L31)

##### destination

> **destination**: `string` \| `null`

Defined in: [core/src/fleet.ts:30](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/fleet.ts#L30)

##### loadDate

> **loadDate**: `string` \| `null`

Defined in: [core/src/fleet.ts:32](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/fleet.ts#L32)

##### origin

> **origin**: `string` \| `null`

Defined in: [core/src/fleet.ts:29](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/fleet.ts#L29)

##### referenceNo

> **referenceNo**: `string` \| `null`

Defined in: [core/src/fleet.ts:28](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/fleet.ts#L28)

##### unloadDate

> **unloadDate**: `string` \| `null`

Defined in: [core/src/fleet.ts:33](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/fleet.ts#L33)

***

### FleetStatusOrderInput

Defined in: [core/src/fleet.ts:8](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/fleet.ts#L8)

#### Properties

##### assignedTo

> **assignedTo**: `string` \| `null`

Defined in: [core/src/fleet.ts:14](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/fleet.ts#L14)

##### destination

> **destination**: `string` \| `null`

Defined in: [core/src/fleet.ts:13](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/fleet.ts#L13)

##### loadDate

> **loadDate**: `string` \| `null`

Defined in: [core/src/fleet.ts:15](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/fleet.ts#L15)

##### origin

> **origin**: `string` \| `null`

Defined in: [core/src/fleet.ts:12](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/fleet.ts#L12)

##### referenceNo

> **referenceNo**: `string` \| `null`

Defined in: [core/src/fleet.ts:11](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/fleet.ts#L11)

##### status

> **status**: `string`

Defined in: [core/src/fleet.ts:10](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/fleet.ts#L10)

##### unloadDate

> **unloadDate**: `string` \| `null`

Defined in: [core/src/fleet.ts:16](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/fleet.ts#L16)

##### vehicleId

> **vehicleId**: `string` \| `null`

Defined in: [core/src/fleet.ts:9](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/fleet.ts#L9)

***

### FleetStatusRow

Defined in: [core/src/fleet.ts:43](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/fleet.ts#L43)

#### Properties

##### lastEvent

> **lastEvent**: [`FleetStatusEvent`](../api/core/src.md#fleetstatusevent) \| `null`

Defined in: [core/src/fleet.ts:50](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/fleet.ts#L50)

Ostatnie zdarzenie trasy pojazdu (najnowsze).

##### order

> **order**: [`FleetStatusOrder`](../api/core/src.md#fleetstatusorder) \| `null`

Defined in: [core/src/fleet.ts:48](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/fleet.ts#L48)

Zlecenie nadające stan: „driving" → w trakcie, „planned" → przypisane.

##### registration

> **registration**: `string`

Defined in: [core/src/fleet.ts:45](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/fleet.ts#L45)

##### state

> **state**: [`FleetVehicleState`](../api/core/src.md#fleetvehiclestate)

Defined in: [core/src/fleet.ts:46](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/fleet.ts#L46)

##### vehicleId

> **vehicleId**: `string`

Defined in: [core/src/fleet.ts:44](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/fleet.ts#L44)

***

### FreightOrderInput

Defined in: [core/src/freightExport.ts:11](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/freightExport.ts#L11)

#### Properties

##### cargo?

> `optional` **cargo?**: `string` \| `null`

Defined in: [core/src/freightExport.ts:17](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/freightExport.ts#L17)

##### currency?

> `optional` **currency?**: `string` \| `null`

Defined in: [core/src/freightExport.ts:20](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/freightExport.ts#L20)

##### destination?

> `optional` **destination?**: `string` \| `null`

Defined in: [core/src/freightExport.ts:14](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/freightExport.ts#L14)

##### loadDate?

> `optional` **loadDate?**: `string` \| `null`

Defined in: [core/src/freightExport.ts:15](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/freightExport.ts#L15)

##### notes?

> `optional` **notes?**: `string` \| `null`

Defined in: [core/src/freightExport.ts:21](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/freightExport.ts#L21)

##### origin?

> `optional` **origin?**: `string` \| `null`

Defined in: [core/src/freightExport.ts:13](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/freightExport.ts#L13)

##### price?

> `optional` **price?**: `number` \| `null`

Defined in: [core/src/freightExport.ts:19](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/freightExport.ts#L19)

##### referenceNo?

> `optional` **referenceNo?**: `string` \| `null`

Defined in: [core/src/freightExport.ts:12](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/freightExport.ts#L12)

##### unloadDate?

> `optional` **unloadDate?**: `string` \| `null`

Defined in: [core/src/freightExport.ts:16](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/freightExport.ts#L16)

##### weightKg?

> `optional` **weightKg?**: `number` \| `null`

Defined in: [core/src/freightExport.ts:18](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/freightExport.ts#L18)

***

### FreightRow

Defined in: [core/src/freightExport.ts:24](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/freightExport.ts#L24)

#### Properties

##### cargo

> **cargo**: `string`

Defined in: [core/src/freightExport.ts:30](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/freightExport.ts#L30)

##### currency

> **currency**: `string`

Defined in: [core/src/freightExport.ts:34](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/freightExport.ts#L34)

##### loadingDate

> **loadingDate**: `string`

Defined in: [core/src/freightExport.ts:27](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/freightExport.ts#L27)

##### loadingPlace

> **loadingPlace**: `string`

Defined in: [core/src/freightExport.ts:26](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/freightExport.ts#L26)

##### notes

> **notes**: `string`

Defined in: [core/src/freightExport.ts:35](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/freightExport.ts#L35)

##### price

> **price**: `number` \| `""`

Defined in: [core/src/freightExport.ts:33](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/freightExport.ts#L33)

##### reference

> **reference**: `string`

Defined in: [core/src/freightExport.ts:25](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/freightExport.ts#L25)

##### unloadingDate

> **unloadingDate**: `string`

Defined in: [core/src/freightExport.ts:29](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/freightExport.ts#L29)

##### unloadingPlace

> **unloadingPlace**: `string`

Defined in: [core/src/freightExport.ts:28](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/freightExport.ts#L28)

##### weightT

> **weightT**: `number` \| `""`

Defined in: [core/src/freightExport.ts:32](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/freightExport.ts#L32)

Waga w tonach (z kg, 2 miejsca) lub "" gdy brak.

***

### FuelAnomaly

Defined in: [core/src/billing.ts:58](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/billing.ts#L58)

#### Properties

##### deltaPct

> **deltaPct**: `number`

Defined in: [core/src/billing.ts:64](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/billing.ts#L64)

O ile % powyżej mediany pojazdu.

##### fromKm

> **fromKm**: `number`

Defined in: [core/src/billing.ts:59](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/billing.ts#L59)

##### lPer100km

> **lPer100km**: `number`

Defined in: [core/src/billing.ts:61](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/billing.ts#L61)

##### medianLPer100km

> **medianLPer100km**: `number`

Defined in: [core/src/billing.ts:62](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/billing.ts#L62)

##### toKm

> **toKm**: `number`

Defined in: [core/src/billing.ts:60](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/billing.ts#L60)

***

### FuelEntry

Defined in: [core/src/billing.ts:11](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/billing.ts#L11)

#### Extended by

- [`FuelEntryFull`](../api/core/src.md#fuelentryfull)

#### Properties

##### liters

> **liters**: `number`

Defined in: [core/src/billing.ts:15](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/billing.ts#L15)

Zatankowane litry (paliwo lub AdBlue — ten sam wzór).

##### odometerKm

> **odometerKm**: `number`

Defined in: [core/src/billing.ts:13](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/billing.ts#L13)

Stan licznika (km) w chwili tankowania.

***

### FuelEntryFull

Defined in: [core/src/billing.ts:120](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/billing.ts#L120)

#### Extends

- [`FuelEntry`](../api/core/src.md#fuelentry)

#### Extended by

- [`SettlementFuelEntry`](../api/core/src.md#settlementfuelentry)

#### Properties

##### isFull?

> `optional` **isFull?**: `boolean`

Defined in: [core/src/billing.ts:122](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/billing.ts#L122)

Czy „do pełna" (domyślnie true). Tylko pełne baki są granicami okna spalania.

##### liters

> **liters**: `number`

Defined in: [core/src/billing.ts:15](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/billing.ts#L15)

Zatankowane litry (paliwo lub AdBlue — ten sam wzór).

###### Inherited from

[`FuelEntry`](../api/core/src.md#fuelentry).[`liters`](../api/core/src.md#liters-2)

##### odometerKm

> **odometerKm**: `number`

Defined in: [core/src/billing.ts:13](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/billing.ts#L13)

Stan licznika (km) w chwili tankowania.

###### Inherited from

[`FuelEntry`](../api/core/src.md#fuelentry).[`odometerKm`](../api/core/src.md#odometerkm)

***

### FuelMonthInput

Defined in: [core/src/fuelTrend.ts:8](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/fuelTrend.ts#L8)

#### Properties

##### date

> **date**: `string`

Defined in: [core/src/fuelTrend.ts:10](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/fuelTrend.ts#L10)

Data tankowania (YYYY-MM-DD lub dłuższa — liczy się prefiks YYYY-MM).

##### liters

> **liters**: `number`

Defined in: [core/src/fuelTrend.ts:11](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/fuelTrend.ts#L11)

##### spend

> **spend**: `number`

Defined in: [core/src/fuelTrend.ts:12](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/fuelTrend.ts#L12)

***

### FuelMonthPoint

Defined in: [core/src/fuelTrend.ts:15](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/fuelTrend.ts#L15)

#### Properties

##### liters

> **liters**: `number`

Defined in: [core/src/fuelTrend.ts:17](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/fuelTrend.ts#L17)

##### month

> **month**: `string`

Defined in: [core/src/fuelTrend.ts:16](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/fuelTrend.ts#L16)

##### spend

> **spend**: `number`

Defined in: [core/src/fuelTrend.ts:18](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/fuelTrend.ts#L18)

***

### FuelStats

Defined in: [core/src/billing.ts:423](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/billing.ts#L423)

#### Properties

##### avgConsumptionLPer100km

> **avgConsumptionLPer100km**: `number` \| `null`

Defined in: [core/src/billing.ts:427](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/billing.ts#L427)

##### count

> **count**: `number`

Defined in: [core/src/billing.ts:424](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/billing.ts#L424)

##### totalDistanceKm

> **totalDistanceKm**: `number`

Defined in: [core/src/billing.ts:426](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/billing.ts#L426)

##### totalLiters

> **totalLiters**: `number`

Defined in: [core/src/billing.ts:425](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/billing.ts#L425)

##### totalSpend

> **totalSpend**: `number`

Defined in: [core/src/billing.ts:428](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/billing.ts#L428)

***

### FuelStatsEntry

Defined in: [core/src/billing.ts:417](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/billing.ts#L417)

#### Properties

##### liters

> **liters**: `number`

Defined in: [core/src/billing.ts:419](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/billing.ts#L419)

##### odometerKm

> **odometerKm**: `number`

Defined in: [core/src/billing.ts:418](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/billing.ts#L418)

##### priceTotal?

> `optional` **priceTotal?**: `number`

Defined in: [core/src/billing.ts:420](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/billing.ts#L420)

***

### GamificationInput

Defined in: [core/src/gamification.ts:8](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/gamification.ts#L8)

#334: Gamifikacja kierowców — punkty, poziomy, odznaki i serie liczone
z realnych danych (dostawy, terminowość, checklisty, km, spalanie, staż).
Czysty silnik: żadnych zapytań, tylko przeliczenie zagregowanych statystyk.
Nadbudowa nad scoringiem (#288) — motywacja kierowcy, nie narzędzie kontroli.

#### Properties

##### activeStreakDays

> **activeStreakDays**: `number`

Defined in: [core/src/gamification.ts:24](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/gamification.ts#L24)

Dni z rzędu z aktywnością (seria).

##### avgConsumption

> **avgConsumption**: `number` \| `null`

Defined in: [core/src/gamification.ts:18](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/gamification.ts#L18)

Średnie spalanie l/100 km (null gdy brak danych).

##### checklists

> **checklists**: `number`

Defined in: [core/src/gamification.ts:14](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/gamification.ts#L14)

Wypełnione checklisty.

##### defectsReported

> **defectsReported**: `number`

Defined in: [core/src/gamification.ts:22](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/gamification.ts#L22)

Zgłoszone usterki (dbałość o pojazd).

##### deliveries

> **deliveries**: `number`

Defined in: [core/src/gamification.ts:10](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/gamification.ts#L10)

Domknięte dostawy (delivered/invoiced) — całość.

##### km

> **km**: `number`

Defined in: [core/src/gamification.ts:16](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/gamification.ts#L16)

Kilometry z tras (trip events).

##### onTimePct

> **onTimePct**: `number` \| `null`

Defined in: [core/src/gamification.ts:12](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/gamification.ts#L12)

Odsetek dostaw na czas (0–1) lub null gdy brak mierzalnych.

##### tenureMonths

> **tenureMonths**: `number`

Defined in: [core/src/gamification.ts:20](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/gamification.ts#L20)

Staż w firmie w miesiącach.

***

### GamificationResult

Defined in: [core/src/gamification.ts:38](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/gamification.ts#L38)

#### Properties

##### badges

> **badges**: [`Badge`](../api/core/src.md#badge)[]

Defined in: [core/src/gamification.ts:46](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/gamification.ts#L46)

##### earnedCount

> **earnedCount**: `number`

Defined in: [core/src/gamification.ts:48](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/gamification.ts#L48)

Liczba zdobytych odznak (tier != null zawsze; liczymy srebrne+ jako „mocne").

##### level

> **level**: `number`

Defined in: [core/src/gamification.ts:40](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/gamification.ts#L40)

##### levelCeil

> **levelCeil**: `number`

Defined in: [core/src/gamification.ts:45](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/gamification.ts#L45)

##### levelFloor

> **levelFloor**: `number`

Defined in: [core/src/gamification.ts:44](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/gamification.ts#L44)

Punkty na starcie bieżącego poziomu i progu następnego.

##### points

> **points**: `number`

Defined in: [core/src/gamification.ts:39](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/gamification.ts#L39)

##### rankKey

> **rankKey**: `string`

Defined in: [core/src/gamification.ts:42](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/gamification.ts#L42)

Nazwa poziomu (klucz i18n: m.game.rank.<key>).

***

### Journey

Defined in: [core/src/journeys.ts:31](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/journeys.ts#L31)

#### Properties

##### adblueCost

> **adblueCost**: `number`

Defined in: [core/src/journeys.ts:49](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/journeys.ts#L49)

##### adblueLiters

> **adblueLiters**: `number`

Defined in: [core/src/journeys.ts:48](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/journeys.ts#L48)

##### avgConsumptionLPer100km

> **avgConsumptionLPer100km**: `number` \| `null`

Defined in: [core/src/journeys.ts:52](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/journeys.ts#L52)

##### cost

> **cost**: `number`

Defined in: [core/src/journeys.ts:53](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/journeys.ts#L53)

##### distanceKm

> **distanceKm**: `number` \| `null`

Defined in: [core/src/journeys.ts:40](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/journeys.ts#L40)

##### driverId

> **driverId**: `string` \| `null`

Defined in: [core/src/journeys.ts:33](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/journeys.ts#L33)

##### durationDays

> **durationDays**: `number` \| `null`

Defined in: [core/src/journeys.ts:41](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/journeys.ts#L41)

##### endAt

> **endAt**: `string` \| `null`

Defined in: [core/src/journeys.ts:37](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/journeys.ts#L37)

##### endKm

> **endKm**: `number` \| `null`

Defined in: [core/src/journeys.ts:39](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/journeys.ts#L39)

##### fuelCost

> **fuelCost**: `number`

Defined in: [core/src/journeys.ts:47](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/journeys.ts#L47)

##### fuelings

> **fuelings**: `number`

Defined in: [core/src/journeys.ts:45](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/journeys.ts#L45)

##### fuelLiters

> **fuelLiters**: `number`

Defined in: [core/src/journeys.ts:46](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/journeys.ts#L46)

##### index

> **index**: `number`

Defined in: [core/src/journeys.ts:35](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/journeys.ts#L35)

Numer wyjazdu per pojazd (1 = najstarszy).

##### loads

> **loads**: `number`

Defined in: [core/src/journeys.ts:42](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/journeys.ts#L42)

##### marginPercent

> **marginPercent**: `number` \| `null`

Defined in: [core/src/journeys.ts:56](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/journeys.ts#L56)

##### open

> **open**: `boolean`

Defined in: [core/src/journeys.ts:58](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/journeys.ts#L58)

Wyjazd bez zakończenia (kierowca jeszcze nie dał „zakończenie").

##### otherCost

> **otherCost**: `number`

Defined in: [core/src/journeys.ts:51](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/journeys.ts#L51)

##### profit

> **profit**: `number` \| `null`

Defined in: [core/src/journeys.ts:55](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/journeys.ts#L55)

##### revenue

> **revenue**: `number` \| `null`

Defined in: [core/src/journeys.ts:54](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/journeys.ts#L54)

##### serviceCost

> **serviceCost**: `number`

Defined in: [core/src/journeys.ts:50](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/journeys.ts#L50)

##### startAt

> **startAt**: `string`

Defined in: [core/src/journeys.ts:36](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/journeys.ts#L36)

##### startKm

> **startKm**: `number` \| `null`

Defined in: [core/src/journeys.ts:38](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/journeys.ts#L38)

##### totalLoadKg

> **totalLoadKg**: `number`

Defined in: [core/src/journeys.ts:44](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/journeys.ts#L44)

##### unloads

> **unloads**: `number`

Defined in: [core/src/journeys.ts:43](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/journeys.ts#L43)

##### vehicleId

> **vehicleId**: `string`

Defined in: [core/src/journeys.ts:32](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/journeys.ts#L32)

***

### JourneyFuelEntry

Defined in: [core/src/journeys.ts:22](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/journeys.ts#L22)

#### Properties

##### createdAt

> **createdAt**: `string`

Defined in: [core/src/journeys.ts:24](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/journeys.ts#L24)

##### isFull?

> `optional` **isFull?**: `boolean`

Defined in: [core/src/journeys.ts:28](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/journeys.ts#L28)

##### liters

> **liters**: `number`

Defined in: [core/src/journeys.ts:26](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/journeys.ts#L26)

##### odometerKm

> **odometerKm**: `number`

Defined in: [core/src/journeys.ts:25](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/journeys.ts#L25)

##### priceTotal?

> `optional` **priceTotal?**: `number` \| `null`

Defined in: [core/src/journeys.ts:27](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/journeys.ts#L27)

##### vehicleId

> **vehicleId**: `string` \| `null`

Defined in: [core/src/journeys.ts:23](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/journeys.ts#L23)

***

### JourneyTripEvent

Defined in: [core/src/journeys.ts:10](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/journeys.ts#L10)

#### Properties

##### action

> **action**: `string`

Defined in: [core/src/journeys.ts:11](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/journeys.ts#L11)

##### amount

> **amount**: `number` \| `null`

Defined in: [core/src/journeys.ts:17](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/journeys.ts#L17)

Kwota kosztu (service/other).

##### createdAt

> **createdAt**: `string`

Defined in: [core/src/journeys.ts:19](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/journeys.ts#L19)

Znacznik czasu ISO (sortowanie i okno wyjazdu).

##### driverId

> **driverId**: `string` \| `null`

Defined in: [core/src/journeys.ts:12](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/journeys.ts#L12)

##### odometerKm

> **odometerKm**: `number` \| `null`

Defined in: [core/src/journeys.ts:14](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/journeys.ts#L14)

##### vehicleId

> **vehicleId**: `string` \| `null`

Defined in: [core/src/journeys.ts:13](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/journeys.ts#L13)

##### weightKg

> **weightKg**: `number` \| `null`

Defined in: [core/src/journeys.ts:15](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/journeys.ts#L15)

***

### KsefInvoice

Defined in: [core/src/ksef.ts:31](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/ksef.ts#L31)

#### Properties

##### buyer

> **buyer**: [`KsefParty`](../api/core/src.md#ksefparty)

Defined in: [core/src/ksef.ts:37](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/ksef.ts#L37)

##### currency

> **currency**: `string`

Defined in: [core/src/ksef.ts:35](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/ksef.ts#L35)

##### dueDate?

> `optional` **dueDate?**: `string` \| `null`

Defined in: [core/src/ksef.ts:43](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/ksef.ts#L43)

Termin płatności YYYY-MM-DD (opcjonalny).

##### gross

> **gross**: `number`

Defined in: [core/src/ksef.ts:41](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/ksef.ts#L41)

##### issueDate

> **issueDate**: `string`

Defined in: [core/src/ksef.ts:34](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/ksef.ts#L34)

Data wystawienia YYYY-MM-DD.

##### lines

> **lines**: [`KsefLine`](../api/core/src.md#ksefline)[]

Defined in: [core/src/ksef.ts:38](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/ksef.ts#L38)

##### net

> **net**: `number`

Defined in: [core/src/ksef.ts:39](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/ksef.ts#L39)

##### number

> **number**: `string`

Defined in: [core/src/ksef.ts:32](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/ksef.ts#L32)

##### seller

> **seller**: [`KsefParty`](../api/core/src.md#ksefparty)

Defined in: [core/src/ksef.ts:36](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/ksef.ts#L36)

##### vatAmount

> **vatAmount**: `number`

Defined in: [core/src/ksef.ts:40](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/ksef.ts#L40)

***

### KsefLine

Defined in: [core/src/ksef.ts:21](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/ksef.ts#L21)

#### Properties

##### description

> **description**: `string`

Defined in: [core/src/ksef.ts:22](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/ksef.ts#L22)

##### net

> **net**: `number`

Defined in: [core/src/ksef.ts:26](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/ksef.ts#L26)

##### quantity

> **quantity**: `number`

Defined in: [core/src/ksef.ts:23](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/ksef.ts#L23)

##### unitPriceNet

> **unitPriceNet**: `number`

Defined in: [core/src/ksef.ts:25](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/ksef.ts#L25)

Cena jednostkowa netto.

##### vatRate

> **vatRate**: `number`

Defined in: [core/src/ksef.ts:28](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/ksef.ts#L28)

Stawka VAT w %, np. 23, 8, 5, 0.

***

### KsefParty

Defined in: [core/src/ksef.ts:14](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/ksef.ts#L14)

#### Properties

##### address

> **address**: `string` \| `null`

Defined in: [core/src/ksef.ts:18](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/ksef.ts#L18)

##### name

> **name**: `string`

Defined in: [core/src/ksef.ts:15](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/ksef.ts#L15)

##### taxId

> **taxId**: `string` \| `null`

Defined in: [core/src/ksef.ts:17](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/ksef.ts#L17)

NIP (dowolny format — cyfry zostaną wyłuskane) lub null/inny identyfikator.

***

### MonthlyCostEntry

Defined in: [core/src/billing.ts:291](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/billing.ts#L291)

#### Properties

##### date

> **date**: `string`

Defined in: [core/src/billing.ts:295](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/billing.ts#L295)

Data zdarzenia (YYYY-MM-DD).

##### priceTotal

> **priceTotal**: `number` \| `null`

Defined in: [core/src/billing.ts:293](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/billing.ts#L293)

##### vehicleId

> **vehicleId**: `string` \| `null`

Defined in: [core/src/billing.ts:292](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/billing.ts#L292)

***

### MonthlyFleetSummary

Defined in: [core/src/billing.ts:307](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/billing.ts#L307)

#### Properties

##### month

> **month**: `string`

Defined in: [core/src/billing.ts:308](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/billing.ts#L308)

##### rows

> **rows**: [`MonthlyVehicleRow`](../api/core/src.md#monthlyvehiclerow)[]

Defined in: [core/src/billing.ts:309](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/billing.ts#L309)

##### totals

> **totals**: `object`

Defined in: [core/src/billing.ts:310](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/billing.ts#L310)

###### adblueCost

> **adblueCost**: `number`

###### fuelCost

> **fuelCost**: `number`

###### net

> **net**: `number`

###### revenueEur

> **revenueEur**: `number`

***

### MonthlyOrderEntry

Defined in: [core/src/billing.ts:282](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/billing.ts#L282)

#### Properties

##### currency

> **currency**: `string`

Defined in: [core/src/billing.ts:285](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/billing.ts#L285)

##### date

> **date**: `string`

Defined in: [core/src/billing.ts:288](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/billing.ts#L288)

Data atrybucji (YYYY-MM-DD) — np. data załadunku lub utworzenia zlecenia.

##### price

> **price**: `number` \| `null`

Defined in: [core/src/billing.ts:284](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/billing.ts#L284)

##### status

> **status**: `string`

Defined in: [core/src/billing.ts:286](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/billing.ts#L286)

##### vehicleId

> **vehicleId**: `string` \| `null`

Defined in: [core/src/billing.ts:283](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/billing.ts#L283)

***

### MonthlyPoint

Defined in: [core/src/insights.ts:10](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/insights.ts#L10)

#### Properties

##### month

> **month**: `string`

Defined in: [core/src/insights.ts:12](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/insights.ts#L12)

Miesiąc „YYYY-MM".

##### value

> **value**: `number`

Defined in: [core/src/insights.ts:14](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/insights.ts#L14)

Wartość (np. koszt paliwa w miesiącu).

***

### MonthlyTotals

Defined in: [core/src/billing.ts:372](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/billing.ts#L372)

#### Extended by

- [`MonthlyTrendPoint`](../api/core/src.md#monthlytrendpoint)

#### Properties

##### adblueCost

> **adblueCost**: `number`

Defined in: [core/src/billing.ts:375](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/billing.ts#L375)

##### fuelCost

> **fuelCost**: `number`

Defined in: [core/src/billing.ts:374](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/billing.ts#L374)

##### net

> **net**: `number`

Defined in: [core/src/billing.ts:376](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/billing.ts#L376)

##### revenueEur

> **revenueEur**: `number`

Defined in: [core/src/billing.ts:373](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/billing.ts#L373)

***

### MonthlyTrendPoint

Defined in: [core/src/billing.ts:378](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/billing.ts#L378)

#### Extends

- [`MonthlyTotals`](../api/core/src.md#monthlytotals)

#### Properties

##### adblueCost

> **adblueCost**: `number`

Defined in: [core/src/billing.ts:375](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/billing.ts#L375)

###### Inherited from

[`MonthlyTotals`](../api/core/src.md#monthlytotals).[`adblueCost`](../api/core/src.md#adbluecost-1)

##### fuelCost

> **fuelCost**: `number`

Defined in: [core/src/billing.ts:374](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/billing.ts#L374)

###### Inherited from

[`MonthlyTotals`](../api/core/src.md#monthlytotals).[`fuelCost`](../api/core/src.md#fuelcost-1)

##### month

> **month**: `string`

Defined in: [core/src/billing.ts:379](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/billing.ts#L379)

##### net

> **net**: `number`

Defined in: [core/src/billing.ts:376](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/billing.ts#L376)

###### Inherited from

[`MonthlyTotals`](../api/core/src.md#monthlytotals).[`net`](../api/core/src.md#net-2)

##### revenueEur

> **revenueEur**: `number`

Defined in: [core/src/billing.ts:373](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/billing.ts#L373)

###### Inherited from

[`MonthlyTotals`](../api/core/src.md#monthlytotals).[`revenueEur`](../api/core/src.md#revenueeur-3)

***

### MonthlyVehicleRow

Defined in: [core/src/billing.ts:298](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/billing.ts#L298)

#### Properties

##### adblueCost

> **adblueCost**: `number`

Defined in: [core/src/billing.ts:302](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/billing.ts#L302)

##### fuelCost

> **fuelCost**: `number`

Defined in: [core/src/billing.ts:301](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/billing.ts#L301)

##### net

> **net**: `number`

Defined in: [core/src/billing.ts:304](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/billing.ts#L304)

Przychód − koszty (paliwo + AdBlue).

##### revenueEur

> **revenueEur**: `number`

Defined in: [core/src/billing.ts:300](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/billing.ts#L300)

##### vehicleId

> **vehicleId**: `string` \| `null`

Defined in: [core/src/billing.ts:299](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/billing.ts#L299)

***

### OrderAnalytics

Defined in: [core/src/orders.ts:22](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/orders.ts#L22)

#### Properties

##### avgRateEur

> **avgRateEur**: `number` \| `null`

Defined in: [core/src/orders.ts:26](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/orders.ts#L26)

Średnia stawka EUR (zlecenia EUR z ceną > 0, niezanulowane). null gdy brak.

##### count

> **count**: `number`

Defined in: [core/src/orders.ts:28](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/orders.ts#L28)

Liczba uwzględnionych zleceń (niezanulowane).

##### topRoutes

> **topRoutes**: [`RouteStat`](../api/core/src.md#routestat)[]

Defined in: [core/src/orders.ts:24](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/orders.ts#L24)

##### topShippers

> **topShippers**: [`ShipperStat`](../api/core/src.md#shipperstat)[]

Defined in: [core/src/orders.ts:23](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/orders.ts#L23)

***

### OrderAnalyticsEntry

Defined in: [core/src/orders.ts:4](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/orders.ts#L4)

#### Properties

##### currency

> **currency**: `string`

Defined in: [core/src/orders.ts:9](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/orders.ts#L9)

##### destination

> **destination**: `string` \| `null`

Defined in: [core/src/orders.ts:7](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/orders.ts#L7)

##### origin

> **origin**: `string` \| `null`

Defined in: [core/src/orders.ts:6](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/orders.ts#L6)

##### price

> **price**: `number` \| `null`

Defined in: [core/src/orders.ts:8](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/orders.ts#L8)

##### shipper

> **shipper**: `string` \| `null`

Defined in: [core/src/orders.ts:5](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/orders.ts#L5)

##### status

> **status**: `string`

Defined in: [core/src/orders.ts:10](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/orders.ts#L10)

***

### OrderCostFuelEntry

Defined in: [core/src/orderCost.ts:23](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/orderCost.ts#L23)

#### Properties

##### liters

> **liters**: `number`

Defined in: [core/src/orderCost.ts:26](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/orderCost.ts#L26)

##### odometerKm

> **odometerKm**: `number`

Defined in: [core/src/orderCost.ts:25](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/orderCost.ts#L25)

##### priceTotal?

> `optional` **priceTotal?**: `number` \| `null`

Defined in: [core/src/orderCost.ts:27](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/orderCost.ts#L27)

##### vehicleId

> **vehicleId**: `string` \| `null`

Defined in: [core/src/orderCost.ts:24](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/orderCost.ts#L24)

***

### OrderFilterItem

Defined in: [core/src/orderFilter.ts:7](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/orderFilter.ts#L7)

Filtrowanie i sortowanie listy zleceń (po stronie klienta) — wyszukiwanie
tekstowe (nadawca/odbiorca/trasa/referencja), filtr statusu i sortowanie.
Czyste i generyczne: zachowuje pełny typ wejściowy (do renderu). Bez UI/API.

#### Properties

##### consignee?

> `optional` **consignee?**: `string` \| `null`

Defined in: [core/src/orderFilter.ts:10](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/orderFilter.ts#L10)

##### created\_at

> **created\_at**: `string`

Defined in: [core/src/orderFilter.ts:16](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/orderFilter.ts#L16)

##### destination?

> `optional` **destination?**: `string` \| `null`

Defined in: [core/src/orderFilter.ts:12](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/orderFilter.ts#L12)

##### load\_date?

> `optional` **load\_date?**: `string` \| `null`

Defined in: [core/src/orderFilter.ts:15](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/orderFilter.ts#L15)

##### origin?

> `optional` **origin?**: `string` \| `null`

Defined in: [core/src/orderFilter.ts:11](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/orderFilter.ts#L11)

##### price?

> `optional` **price?**: `number` \| `null`

Defined in: [core/src/orderFilter.ts:14](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/orderFilter.ts#L14)

##### reference\_no?

> `optional` **reference\_no?**: `string` \| `null`

Defined in: [core/src/orderFilter.ts:8](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/orderFilter.ts#L8)

##### shipper?

> `optional` **shipper?**: `string` \| `null`

Defined in: [core/src/orderFilter.ts:9](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/orderFilter.ts#L9)

##### status

> **status**: `string`

Defined in: [core/src/orderFilter.ts:13](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/orderFilter.ts#L13)

***

### OrderLegEvent

Defined in: [core/src/orderCost.ts:15](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/orderCost.ts#L15)

#### Properties

##### action

> **action**: `string`

Defined in: [core/src/orderCost.ts:17](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/orderCost.ts#L17)

##### createdAt

> **createdAt**: `string`

Defined in: [core/src/orderCost.ts:20](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/orderCost.ts#L20)

##### odometerKm

> **odometerKm**: `number` \| `null`

Defined in: [core/src/orderCost.ts:19](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/orderCost.ts#L19)

##### orderId

> **orderId**: `string` \| `null`

Defined in: [core/src/orderCost.ts:16](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/orderCost.ts#L16)

##### vehicleId

> **vehicleId**: `string` \| `null`

Defined in: [core/src/orderCost.ts:18](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/orderCost.ts#L18)

***

### OrderQuery

Defined in: [core/src/orderFilter.ts:22](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/orderFilter.ts#L22)

#### Properties

##### sort?

> `optional` **sort?**: `"date_desc"` \| `"date_asc"` \| `"price_desc"` \| `"price_asc"`

Defined in: [core/src/orderFilter.ts:27](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/orderFilter.ts#L27)

##### status?

> `optional` **status?**: `string`

Defined in: [core/src/orderFilter.ts:26](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/orderFilter.ts#L26)

Status do filtra lub "all".

##### text?

> `optional` **text?**: `string`

Defined in: [core/src/orderFilter.ts:24](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/orderFilter.ts#L24)

Fraza szukana w referencji/nadawcy/odbiorcy/trasie (bez rozróżniania wielkości liter).

***

### OrderRef

Defined in: [core/src/orderCost.ts:30](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/orderCost.ts#L30)

#### Properties

##### currency

> **currency**: `string`

Defined in: [core/src/orderCost.ts:33](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/orderCost.ts#L33)

##### id

> **id**: `string`

Defined in: [core/src/orderCost.ts:31](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/orderCost.ts#L31)

##### price

> **price**: `number` \| `null`

Defined in: [core/src/orderCost.ts:32](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/orderCost.ts#L32)

***

### OrderTransportCost

Defined in: [core/src/orderCost.ts:38](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/orderCost.ts#L38)

#### Properties

##### complete

> **complete**: `boolean`

Defined in: [core/src/orderCost.ts:53](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/orderCost.ts#L53)

Ma komplet: załadunek + rozładunek (ten sam pojazd) z licznikami oraz policzony koszt.

##### cost

> **cost**: `number` \| `null`

Defined in: [core/src/orderCost.ts:44](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/orderCost.ts#L44)

##### costPerKm

> **costPerKm**: `number` \| `null`

Defined in: [core/src/orderCost.ts:43](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/orderCost.ts#L43)

##### currency

> **currency**: `string`

Defined in: [core/src/orderCost.ts:47](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/orderCost.ts#L47)

##### distanceKm

> **distanceKm**: `number` \| `null`

Defined in: [core/src/orderCost.ts:41](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/orderCost.ts#L41)

##### durationDays

> **durationDays**: `number` \| `null`

Defined in: [core/src/orderCost.ts:42](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/orderCost.ts#L42)

##### loadAt

> **loadAt**: `string` \| `null`

Defined in: [core/src/orderCost.ts:50](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/orderCost.ts#L50)

##### marginPercent

> **marginPercent**: `number` \| `null`

Defined in: [core/src/orderCost.ts:49](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/orderCost.ts#L49)

##### method

> **method**: [`OrderCostMethod`](../api/core/src.md#ordercostmethod)

Defined in: [core/src/orderCost.ts:45](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/orderCost.ts#L45)

##### orderId

> **orderId**: `string`

Defined in: [core/src/orderCost.ts:39](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/orderCost.ts#L39)

##### profit

> **profit**: `number` \| `null`

Defined in: [core/src/orderCost.ts:48](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/orderCost.ts#L48)

##### revenue

> **revenue**: `number` \| `null`

Defined in: [core/src/orderCost.ts:46](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/orderCost.ts#L46)

##### unloadAt

> **unloadAt**: `string` \| `null`

Defined in: [core/src/orderCost.ts:51](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/orderCost.ts#L51)

##### vehicleId

> **vehicleId**: `string` \| `null`

Defined in: [core/src/orderCost.ts:40](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/orderCost.ts#L40)

***

### OrderTransportCostInput

Defined in: [core/src/orderCost.ts:56](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/orderCost.ts#L56)

#### Properties

##### adblue?

> `optional` **adblue?**: [`OrderCostFuelEntry`](../api/core/src.md#ordercostfuelentry)[]

Defined in: [core/src/orderCost.ts:63](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/orderCost.ts#L63)

Tankowania AdBlue — doliczane do licznika kosztu (opcjonalne).

##### costPerKmByVehicle?

> `optional` **costPerKmByVehicle?**: `Record`\<`string`, `number`\>

Defined in: [core/src/orderCost.ts:65](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/orderCost.ts#L65)

Nadpisanie kosztu/km per pojazd (pierwszeństwo przed wyliczeniem z paliwa).

##### events

> **events**: [`OrderLegEvent`](../api/core/src.md#orderlegevent)[]

Defined in: [core/src/orderCost.ts:59](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/orderCost.ts#L59)

Zdarzenia trasy powiązane ze zleceniami (`order_id`).

##### fuel

> **fuel**: [`OrderCostFuelEntry`](../api/core/src.md#ordercostfuelentry)[]

Defined in: [core/src/orderCost.ts:61](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/orderCost.ts#L61)

Tankowania paliwa — do wyliczenia kosztu/km pojazdu.

##### orders

> **orders**: [`OrderRef`](../api/core/src.md#orderref)[]

Defined in: [core/src/orderCost.ts:57](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/orderCost.ts#L57)

***

### PayoutBalance

Defined in: [core/src/payouts.ts:27](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/payouts.ts#L27)

#### Properties

##### advance

> **advance**: `number`

Defined in: [core/src/payouts.ts:30](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/payouts.ts#L30)

##### balance

> **balance**: `number`

Defined in: [core/src/payouts.ts:34](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/payouts.ts#L34)

Pozostało do wypłaty = należność − zaliczki − potrącenia − wypłaty.

##### currency

> **currency**: `string`

Defined in: [core/src/payouts.ts:28](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/payouts.ts#L28)

##### deduction

> **deduction**: `number`

Defined in: [core/src/payouts.ts:31](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/payouts.ts#L31)

##### due

> **due**: `number`

Defined in: [core/src/payouts.ts:29](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/payouts.ts#L29)

##### payout

> **payout**: `number`

Defined in: [core/src/payouts.ts:32](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/payouts.ts#L32)

***

### PayoutEntry

Defined in: [core/src/payouts.ts:21](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/payouts.ts#L21)

#### Properties

##### amount

> **amount**: `number`

Defined in: [core/src/payouts.ts:23](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/payouts.ts#L23)

##### currency

> **currency**: `string`

Defined in: [core/src/payouts.ts:24](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/payouts.ts#L24)

##### kind

> **kind**: `"due"` \| `"advance"` \| `"deduction"` \| `"payout"`

Defined in: [core/src/payouts.ts:22](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/payouts.ts#L22)

***

### PerDiemTotal

Defined in: [core/src/perDiem.ts:92](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/perDiem.ts#L92)

#### Properties

##### amount

> **amount**: `number`

Defined in: [core/src/perDiem.ts:94](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/perDiem.ts#L94)

##### count

> **count**: `number`

Defined in: [core/src/perDiem.ts:96](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/perDiem.ts#L96)

Liczba podróży w tej walucie.

##### currency

> **currency**: `string`

Defined in: [core/src/perDiem.ts:93](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/perDiem.ts#L93)

##### days

> **days**: `number`

Defined in: [core/src/perDiem.ts:98](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/perDiem.ts#L98)

Suma należnych dób.

***

### PodInfo

Defined in: [core/src/pod.ts:17](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/pod.ts#L17)

#### Properties

##### recipient

> **recipient**: `string` \| `null`

Defined in: [core/src/pod.ts:19](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/pod.ts#L19)

Imię i nazwisko odbiorcy (lub null, gdy nie podano).

##### when

> **when**: `string` \| `null`

Defined in: [core/src/pod.ts:21](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/pod.ts#L21)

Data/godzina złożenia podpisu jako tekst (lub null).

***

### ProfitOrderEntry

Defined in: [core/src/profitability.ts:7](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/profitability.ts#L7)

#### Properties

##### currency

> **currency**: `string`

Defined in: [core/src/profitability.ts:11](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/profitability.ts#L11)

##### price

> **price**: `number` \| `null`

Defined in: [core/src/profitability.ts:10](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/profitability.ts#L10)

##### shipper

> **shipper**: `string` \| `null`

Defined in: [core/src/profitability.ts:8](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/profitability.ts#L8)

##### status

> **status**: `string`

Defined in: [core/src/profitability.ts:12](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/profitability.ts#L12)

##### vehicleId

> **vehicleId**: `string` \| `null`

Defined in: [core/src/profitability.ts:9](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/profitability.ts#L9)

***

### RateLike

Defined in: [core/src/rates.ts:6](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/rates.ts#L6)

Wybór domyślnej stawki €/km dla pojazdu.
Reguła: najpierw najnowsza stawka danego pojazdu, w razie braku — najnowsza
domyślna firmowa (`vehicleId === null`). Deterministyczne, czyste (bez I/O).

#### Properties

##### ratePerKm

> **ratePerKm**: `number`

Defined in: [core/src/rates.ts:8](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/rates.ts#L8)

##### validFrom

> **validFrom**: `string`

Defined in: [core/src/rates.ts:10](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/rates.ts#L10)

Data w formacie ISO `YYYY-MM-DD` — porównywalna leksykograficznie.

##### vehicleId

> **vehicleId**: `string` \| `null`

Defined in: [core/src/rates.ts:7](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/rates.ts#L7)

***

### ReceiptParse

Defined in: [core/src/receipt.ts:7](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/receipt.ts#L7)

#298: Parser tekstu paragonu (wynik OCR) — heurystyki odczytu kwoty i waluty.
Czysty TS (bez zależności), współdzielony web↔mobile; OCR robi klient
(ML Kit na urządzeniu), tu tylko interpretacja tekstu.

#### Properties

##### amount

> **amount**: `number` \| `null`

Defined in: [core/src/receipt.ts:9](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/receipt.ts#L9)

Kwota do zapłaty (zaokrąglona do groszy) lub null, gdy nie znaleziono.

##### currency

> **currency**: `string` \| `null`

Defined in: [core/src/receipt.ts:11](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/receipt.ts#L11)

Waluta ISO (PLN/EUR/GBP/CZK/…) lub null.

##### liters

> **liters**: `number` \| `null`

Defined in: [core/src/receipt.ts:13](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/receipt.ts#L13)

#299: zatankowane litry (z paragonu stacji) lub null.

***

### RouteCandidate

Defined in: [core/src/ecoRoute.ts:50](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/ecoRoute.ts#L50)

#### Properties

##### distanceKm

> **distanceKm**: `number`

Defined in: [core/src/ecoRoute.ts:53](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/ecoRoute.ts#L53)

##### durationMin?

> `optional` **durationMin?**: `number`

Defined in: [core/src/ecoRoute.ts:55](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/ecoRoute.ts#L55)

Czas przejazdu [min] — do informacji o kompromisie eco↔czas.

##### label

> **label**: `string`

Defined in: [core/src/ecoRoute.ts:52](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/ecoRoute.ts#L52)

Etykieta wariantu (np. „najszybsza", „bez autostrad").

##### tollCost?

> `optional` **tollCost?**: `number`

Defined in: [core/src/ecoRoute.ts:56](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/ecoRoute.ts#L56)

***

### RouteDelta

Defined in: [core/src/savedPlaces.ts:33](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/savedPlaces.ts#L33)

#### Properties

##### distanceKm

> **distanceKm**: `number`

Defined in: [core/src/savedPlaces.ts:34](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/savedPlaces.ts#L34)

##### durationMin

> **durationMin**: `number`

Defined in: [core/src/savedPlaces.ts:35](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/savedPlaces.ts#L35)

##### longer

> **longer**: `boolean`

Defined in: [core/src/savedPlaces.ts:38](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/savedPlaces.ts#L38)

true = trasa po zmianie jest dłuższa (dystans).

##### negligible

> **negligible**: `boolean`

Defined in: [core/src/savedPlaces.ts:40](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/savedPlaces.ts#L40)

true = bez realnej różnicy (wszystkie delty ≈ 0).

##### tollEur

> **tollEur**: `number`

Defined in: [core/src/savedPlaces.ts:36](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/savedPlaces.ts#L36)

***

### RouteFuelEstimate

Defined in: [core/src/ecoRoute.ts:19](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/ecoRoute.ts#L19)

#### Properties

##### co2Kg

> **co2Kg**: `number`

Defined in: [core/src/ecoRoute.ts:25](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/ecoRoute.ts#L25)

##### distanceKm

> **distanceKm**: `number`

Defined in: [core/src/ecoRoute.ts:20](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/ecoRoute.ts#L20)

##### fuelCost

> **fuelCost**: `number`

Defined in: [core/src/ecoRoute.ts:22](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/ecoRoute.ts#L22)

##### fuelLiters

> **fuelLiters**: `number`

Defined in: [core/src/ecoRoute.ts:21](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/ecoRoute.ts#L21)

##### tollCost

> **tollCost**: `number`

Defined in: [core/src/ecoRoute.ts:23](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/ecoRoute.ts#L23)

##### totalCost

> **totalCost**: `number`

Defined in: [core/src/ecoRoute.ts:24](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/ecoRoute.ts#L24)

***

### RouteFuelInput

Defined in: [core/src/ecoRoute.ts:10](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/ecoRoute.ts#L10)

#### Properties

##### avgConsumptionL100?

> `optional` **avgConsumptionL100?**: `number`

Defined in: [core/src/ecoRoute.ts:13](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/ecoRoute.ts#L13)

Średnie spalanie l/100 km (domyślnie 30 dla zestawu TIR).

##### distanceKm

> **distanceKm**: `number`

Defined in: [core/src/ecoRoute.ts:11](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/ecoRoute.ts#L11)

##### fuelPricePerL

> **fuelPricePerL**: `number`

Defined in: [core/src/ecoRoute.ts:14](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/ecoRoute.ts#L14)

##### tollCost?

> `optional` **tollCost?**: `number`

Defined in: [core/src/ecoRoute.ts:16](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/ecoRoute.ts#L16)

Koszt myta na trasie (waluta) — domyślnie 0.

***

### RouteStat

Defined in: [core/src/orders.ts:18](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/orders.ts#L18)

#### Properties

##### count

> **count**: `number`

Defined in: [core/src/orders.ts:20](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/orders.ts#L20)

##### route

> **route**: `string`

Defined in: [core/src/orders.ts:19](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/orders.ts#L19)

***

### RouteTotals

Defined in: [core/src/savedPlaces.ts:27](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/savedPlaces.ts#L27)

Suma trasy do porównania (przychodzi z wyniku routingu).

#### Properties

##### distanceKm

> **distanceKm**: `number`

Defined in: [core/src/savedPlaces.ts:28](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/savedPlaces.ts#L28)

##### durationMin

> **durationMin**: `number`

Defined in: [core/src/savedPlaces.ts:29](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/savedPlaces.ts#L29)

##### tollEur

> **tollEur**: `number`

Defined in: [core/src/savedPlaces.ts:30](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/savedPlaces.ts#L30)

***

### SearchItem

Defined in: [core/src/search.ts:7](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/search.ts#L7)

Globalne wyszukiwanie w panelu — czysty filtr/ranking po znormalizowanych
pozycjach (zlecenia, pojazdy, kierowcy, faktury). Komponent buduje listę
`SearchItem[]` z danych, ten silnik tylko dopasowuje i sortuje. Bez UI.

#### Properties

##### href

> **href**: `string`

Defined in: [core/src/search.ts:14](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/search.ts#L14)

Dokąd prowadzi wynik.

##### id

> **id**: `string`

Defined in: [core/src/search.ts:10](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/search.ts#L10)

##### keywords?

> `optional` **keywords?**: `string`

Defined in: [core/src/search.ts:16](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/search.ts#L16)

Dodatkowy tekst do przeszukania (np. nadawca, VIN, NIP).

##### subtitle?

> `optional` **subtitle?**: `string`

Defined in: [core/src/search.ts:12](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/search.ts#L12)

##### title

> **title**: `string`

Defined in: [core/src/search.ts:11](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/search.ts#L11)

##### type

> **type**: `string`

Defined in: [core/src/search.ts:9](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/search.ts#L9)

Kategoria do nagłówka/etykiety (np. „Zlecenie", „Pojazd").

***

### ServiceStatus

Defined in: [core/src/expiry.ts:22](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/expiry.ts#L22)

#### Properties

##### dueKm

> **dueKm**: `number` \| `null`

Defined in: [core/src/expiry.ts:26](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/expiry.ts#L26)

Docelowy przebieg serwisu. null gdy brak danych.

##### kmLeft

> **kmLeft**: `number` \| `null`

Defined in: [core/src/expiry.ts:24](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/expiry.ts#L24)

Ile km do serwisu (ujemne = po przebiegu). null gdy brak danych.

##### level

> **level**: [`ExpiryLevel`](../api/core/src.md#expirylevel)

Defined in: [core/src/expiry.ts:27](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/expiry.ts#L27)

***

### Settlement

Defined in: [core/src/billing.ts:203](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/billing.ts#L203)

#### Properties

##### adblueCost

> **adblueCost**: `number`

Defined in: [core/src/billing.ts:209](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/billing.ts#L209)

##### adblueLiters

> **adblueLiters**: `number`

Defined in: [core/src/billing.ts:208](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/billing.ts#L208)

##### avgConsumptionLPer100km

> **avgConsumptionLPer100km**: `number` \| `null`

Defined in: [core/src/billing.ts:207](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/billing.ts#L207)

##### distanceKm

> **distanceKm**: `number`

Defined in: [core/src/billing.ts:204](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/billing.ts#L204)

##### fuelCost

> **fuelCost**: `number`

Defined in: [core/src/billing.ts:206](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/billing.ts#L206)

##### fuelLiters

> **fuelLiters**: `number`

Defined in: [core/src/billing.ts:205](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/billing.ts#L205)

##### marginPercent

> **marginPercent**: `number` \| `null`

Defined in: [core/src/billing.ts:216](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/billing.ts#L216)

##### otherCost

> **otherCost**: `number`

Defined in: [core/src/billing.ts:211](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/billing.ts#L211)

##### profit

> **profit**: `number`

Defined in: [core/src/billing.ts:215](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/billing.ts#L215)

##### revenue

> **revenue**: `number`

Defined in: [core/src/billing.ts:214](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/billing.ts#L214)

##### serviceCost

> **serviceCost**: `number`

Defined in: [core/src/billing.ts:210](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/billing.ts#L210)

##### tollCost

> **tollCost**: `number`

Defined in: [core/src/billing.ts:212](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/billing.ts#L212)

##### totalCost

> **totalCost**: `number`

Defined in: [core/src/billing.ts:213](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/billing.ts#L213)

***

### SettlementFuelEntry

Defined in: [core/src/billing.ts:186](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/billing.ts#L186)

#### Extends

- [`FuelEntryFull`](../api/core/src.md#fuelentryfull)

#### Properties

##### isFull?

> `optional` **isFull?**: `boolean`

Defined in: [core/src/billing.ts:122](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/billing.ts#L122)

Czy „do pełna" (domyślnie true). Tylko pełne baki są granicami okna spalania.

###### Inherited from

[`FuelEntryFull`](../api/core/src.md#fuelentryfull).[`isFull`](../api/core/src.md#isfull)

##### liters

> **liters**: `number`

Defined in: [core/src/billing.ts:15](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/billing.ts#L15)

Zatankowane litry (paliwo lub AdBlue — ten sam wzór).

###### Inherited from

[`FuelEntryFull`](../api/core/src.md#fuelentryfull).[`liters`](../api/core/src.md#liters-3)

##### odometerKm

> **odometerKm**: `number`

Defined in: [core/src/billing.ts:13](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/billing.ts#L13)

Stan licznika (km) w chwili tankowania.

###### Inherited from

[`FuelEntryFull`](../api/core/src.md#fuelentryfull).[`odometerKm`](../api/core/src.md#odometerkm-1)

##### priceTotal?

> `optional` **priceTotal?**: `number`

Defined in: [core/src/billing.ts:187](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/billing.ts#L187)

***

### SettlementInput

Defined in: [core/src/billing.ts:190](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/billing.ts#L190)

#### Properties

##### adblue

> **adblue**: `object`[]

Defined in: [core/src/billing.ts:194](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/billing.ts#L194)

Tankowania AdBlue (litry + koszt).

###### liters

> **liters**: `number`

###### priceTotal?

> `optional` **priceTotal?**: `number`

##### fuel

> **fuel**: [`SettlementFuelEntry`](../api/core/src.md#settlementfuelentry)[]

Defined in: [core/src/billing.ts:192](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/billing.ts#L192)

Tankowania paliwa w okresie (do dystansu, litrów, kosztu, spalania).

##### ratePerKm?

> `optional` **ratePerKm?**: `number`

Defined in: [core/src/billing.ts:198](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/billing.ts#L198)

Stawka frachtu za km (opcjonalnie — do przychodu/zysku).

##### tollCost?

> `optional` **tollCost?**: `number`

Defined in: [core/src/billing.ts:200](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/billing.ts#L200)

Myto za okres (opcjonalnie — wliczane do kosztów).

##### trips

> **trips**: `object`[]

Defined in: [core/src/billing.ts:196](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/billing.ts#L196)

Zdarzenia trasy — koszty serwisu/innych z pola `amount`.

###### action

> **action**: `string`

###### amount?

> `optional` **amount?**: `number` \| `null`

***

### SettlementSettings

Defined in: [core/src/driverSettlement.ts:16](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/driverSettlement.ts#L16)

Rozliczenie miesięczne kierowcy (#265) — silnik liczenia wg wzorcowego
formularza właściciela. WSZYSTKIE stawki/normy są parametrami per firma
(tabela `company_settlement_settings`) — domyślne wartości to tylko seed.

Formuły (odtworzone 1:1 z arkusza):
 • kwota podstawowa   = dni × stawka dzienna
 • premia dokument.   = (premia mies. / 30) × dni
 • premia tygodniowa  = max(0, km_tygodnia − dni_tygodnia × norma_km) × stawka_km
 • ubezpieczenie      = stawka/dzień × dni
 • telefon            = (ryczałt mies. / 30) × dni
 • RAZEM = podstawa + PREMIA RAZEM (dok. + norma + tygodnie + ubezp.) + telefon + hotele

#### Properties

##### dailyRate

> **dailyRate**: `number`

Defined in: [core/src/driverSettlement.ts:17](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/driverSettlement.ts#L17)

##### docBonusMonthly

> **docBonusMonthly**: `number`

Defined in: [core/src/driverSettlement.ts:22](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/driverSettlement.ts#L22)

##### insurancePerDay

> **insurancePerDay**: `number`

Defined in: [core/src/driverSettlement.ts:20](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/driverSettlement.ts#L20)

##### kmNormPerDay

> **kmNormPerDay**: `number`

Defined in: [core/src/driverSettlement.ts:18](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/driverSettlement.ts#L18)

##### kmRate

> **kmRate**: `number`

Defined in: [core/src/driverSettlement.ts:19](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/driverSettlement.ts#L19)

##### phoneMonthly

> **phoneMonthly**: `number`

Defined in: [core/src/driverSettlement.ts:21](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/driverSettlement.ts#L21)

***

### SettlementWeek

Defined in: [core/src/driverSettlement.ts:34](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/driverSettlement.ts#L34)

#### Properties

##### days

> **days**: `number`

Defined in: [core/src/driverSettlement.ts:35](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/driverSettlement.ts#L35)

##### km

> **km**: `number`

Defined in: [core/src/driverSettlement.ts:36](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/driverSettlement.ts#L36)

***

### ShipperStat

Defined in: [core/src/orders.ts:13](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/orders.ts#L13)

#### Properties

##### count

> **count**: `number`

Defined in: [core/src/orders.ts:15](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/orders.ts#L15)

##### name

> **name**: `string`

Defined in: [core/src/orders.ts:14](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/orders.ts#L14)

##### revenueEur

> **revenueEur**: `number`

Defined in: [core/src/orders.ts:16](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/orders.ts#L16)

***

### TachoDay

Defined in: [core/src/tachoTime.ts:21](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/tachoTime.ts#L21)

#### Properties

##### alerts

> **alerts**: `string`[]

Defined in: [core/src/tachoTime.ts:30](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/tachoTime.ts#L30)

##### date

> **date**: `string`

Defined in: [core/src/tachoTime.ts:22](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/tachoTime.ts#L22)

##### endTime

> **endTime**: `string` \| `null`

Defined in: [core/src/tachoTime.ts:24](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/tachoTime.ts#L24)

##### restBeforeMinutes

> **restBeforeMinutes**: `number` \| `null`

Defined in: [core/src/tachoTime.ts:28](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/tachoTime.ts#L28)

Odpoczynek od końca poprzedniego dnia do startu [min].

##### restType

> **restType**: [`RestType`](../api/core/src.md#resttype-1) \| `null`

Defined in: [core/src/tachoTime.ts:29](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/tachoTime.ts#L29)

##### startTime

> **startTime**: `string` \| `null`

Defined in: [core/src/tachoTime.ts:23](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/tachoTime.ts#L23)

##### workMinutes

> **workMinutes**: `number` \| `null`

Defined in: [core/src/tachoTime.ts:26](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/tachoTime.ts#L26)

Czas służby start→koniec [min]; null gdy niekompletny dzień.

***

### TachoEntry

Defined in: [core/src/tachoTime.ts:10](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/tachoTime.ts#L10)

#277: automatyczny czas pracy z checklisty „Tachograf" — kierowca odhacza
tryby (Rozpoczęcie/Zakończenie dnia, Łóżko, Prom, Młotki) z godziną, a silnik
wylicza dni pracy, odpoczynki dobowe i tygodniowe wg progów 561/2006:
odpoczynek dobowy ≥11 h (normalny) / 9–11 h (skrócony) / <9 h (naruszenie);
tygodniowy ≥45 h (normalny) / 24–45 h (skrócony). To POMOC ewidencyjna,
nie zamiennik karty kierowcy.

#### Properties

##### date

> **date**: `string`

Defined in: [core/src/tachoTime.ts:12](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/tachoTime.ts#L12)

Data zgłoszenia (YYYY-MM-DD, z created_at).

##### modes

> **modes**: `string`[]

Defined in: [core/src/tachoTime.ts:16](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/tachoTime.ts#L16)

Zaznaczone tryby (np. ["Rozpoczęcie dnia"], ["Prom","Łóżko"]).

##### time

> **time**: `string`

Defined in: [core/src/tachoTime.ts:14](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/tachoTime.ts#L14)

Godzina z checklisty (HH:MM) — edytowana przez kierowcę.

***

### TachoSummary

Defined in: [core/src/tachoTime.ts:33](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/tachoTime.ts#L33)

#### Properties

##### alerts

> **alerts**: `string`[]

Defined in: [core/src/tachoTime.ts:36](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/tachoTime.ts#L36)

##### days

> **days**: [`TachoDay`](../api/core/src.md#tachoday)[]

Defined in: [core/src/tachoTime.ts:34](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/tachoTime.ts#L34)

##### totalWorkMinutes

> **totalWorkMinutes**: `number`

Defined in: [core/src/tachoTime.ts:35](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/tachoTime.ts#L35)

***

### ToFakturowniaInput

Defined in: [core/src/fakturownia.ts:32](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/fakturownia.ts#L32)

#### Properties

##### buyer

> **buyer**: `object`

Defined in: [core/src/fakturownia.ts:42](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/fakturownia.ts#L42)

###### address?

> `optional` **address?**: `string` \| `null`

###### name?

> `optional` **name?**: `string` \| `null`

###### taxId?

> `optional` **taxId?**: `string` \| `null`

##### currency

> **currency**: `string`

Defined in: [core/src/fakturownia.ts:35](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/fakturownia.ts#L35)

##### dueDate?

> `optional` **dueDate?**: `string` \| `null`

Defined in: [core/src/fakturownia.ts:34](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/fakturownia.ts#L34)

##### fallback?

> `optional` **fallback?**: `object`

Defined in: [core/src/fakturownia.ts:45](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/fakturownia.ts#L45)

###### description

> **description**: `string`

###### gross

> **gross**: `number`

###### vatRate

> **vatRate**: `number`

##### issueDate

> **issueDate**: `string`

Defined in: [core/src/fakturownia.ts:33](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/fakturownia.ts#L33)

##### items

> **items**: `object`[]

Defined in: [core/src/fakturownia.ts:44](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/fakturownia.ts#L44)

Pozycje faktury. Gdy puste, mapper tworzy jedną z `fallback`.

###### description

> **description**: `string`

###### gross

> **gross**: `number`

###### quantity

> **quantity**: `number`

###### vatRate

> **vatRate**: `number`

##### seller

> **seller**: `object`

Defined in: [core/src/fakturownia.ts:36](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/fakturownia.ts#L36)

###### account?

> `optional` **account?**: `string` \| `null`

###### bank?

> `optional` **bank?**: `string` \| `null`

###### name?

> `optional` **name?**: `string` \| `null`

###### taxId?

> `optional` **taxId?**: `string` \| `null`

***

### TrendResult

Defined in: [core/src/insights.ts:25](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/insights.ts#L25)

#### Properties

##### changePct

> **changePct**: `number`

Defined in: [core/src/insights.ts:28](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/insights.ts#L28)

Zmiana ostatniego miesiąca vs. pierwszego w oknie [%].

##### direction

> **direction**: `"up"` \| `"down"` \| `"flat"`

Defined in: [core/src/insights.ts:26](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/insights.ts#L26)

##### forecastNext

> **forecastNext**: `number`

Defined in: [core/src/insights.ts:30](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/insights.ts#L30)

Prognoza wartości na kolejny miesiąc (regresja liniowa).

##### slope

> **slope**: `number`

Defined in: [core/src/insights.ts:32](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/insights.ts#L32)

Nachylenie regresji (wartość/miesiąc).

***

### TripProfit

Defined in: [core/src/billing.ts:169](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/billing.ts#L169)

#### Properties

##### cost

> **cost**: `number`

Defined in: [core/src/billing.ts:171](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/billing.ts#L171)

##### marginPercent

> **marginPercent**: `number` \| `null`

Defined in: [core/src/billing.ts:174](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/billing.ts#L174)

Marża w % (null, gdy przychód = 0).

##### profit

> **profit**: `number`

Defined in: [core/src/billing.ts:172](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/billing.ts#L172)

##### revenue

> **revenue**: `number`

Defined in: [core/src/billing.ts:170](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/billing.ts#L170)

***

### VatRegister

Defined in: [core/src/accounting.ts:25](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/accounting.ts#L25)

#### Properties

##### count

> **count**: `number`

Defined in: [core/src/accounting.ts:30](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/accounting.ts#L30)

##### rows

> **rows**: [`VatRegisterRow`](../api/core/src.md#vatregisterrow)[]

Defined in: [core/src/accounting.ts:26](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/accounting.ts#L26)

##### totalGross

> **totalGross**: `number`

Defined in: [core/src/accounting.ts:29](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/accounting.ts#L29)

##### totalNet

> **totalNet**: `number`

Defined in: [core/src/accounting.ts:27](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/accounting.ts#L27)

##### totalVat

> **totalVat**: `number`

Defined in: [core/src/accounting.ts:28](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/accounting.ts#L28)

***

### VatRegisterInvoice

Defined in: [core/src/accounting.ts:7](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/accounting.ts#L7)

#### Properties

##### currency

> **currency**: `string`

Defined in: [core/src/accounting.ts:14](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/accounting.ts#L14)

##### gross

> **gross**: `number`

Defined in: [core/src/accounting.ts:13](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/accounting.ts#L13)

##### issue\_date

> **issue\_date**: `string`

Defined in: [core/src/accounting.ts:9](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/accounting.ts#L9)

##### net

> **net**: `number`

Defined in: [core/src/accounting.ts:10](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/accounting.ts#L10)

##### status

> **status**: `string`

Defined in: [core/src/accounting.ts:8](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/accounting.ts#L8)

##### vat\_amount

> **vat\_amount**: `number`

Defined in: [core/src/accounting.ts:12](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/accounting.ts#L12)

##### vat\_rate

> **vat\_rate**: `number`

Defined in: [core/src/accounting.ts:11](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/accounting.ts#L11)

***

### VatRegisterRow

Defined in: [core/src/accounting.ts:17](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/accounting.ts#L17)

#### Properties

##### count

> **count**: `number`

Defined in: [core/src/accounting.ts:22](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/accounting.ts#L22)

##### gross

> **gross**: `number`

Defined in: [core/src/accounting.ts:21](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/accounting.ts#L21)

##### net

> **net**: `number`

Defined in: [core/src/accounting.ts:19](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/accounting.ts#L19)

##### vat

> **vat**: `number`

Defined in: [core/src/accounting.ts:20](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/accounting.ts#L20)

##### vatRate

> **vatRate**: `number`

Defined in: [core/src/accounting.ts:18](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/accounting.ts#L18)

***

### VatSummaryRow

Defined in: [core/src/invoice.ts:24](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/invoice.ts#L24)

#### Properties

##### gross

> **gross**: `number`

Defined in: [core/src/invoice.ts:28](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/invoice.ts#L28)

##### net

> **net**: `number`

Defined in: [core/src/invoice.ts:26](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/invoice.ts#L26)

##### rate

> **rate**: `number`

Defined in: [core/src/invoice.ts:25](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/invoice.ts#L25)

##### vat

> **vat**: `number`

Defined in: [core/src/invoice.ts:27](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/invoice.ts#L27)

***

### VehicleAmountEur

Defined in: [core/src/vehiclePnl.ts:49](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/vehiclePnl.ts#L49)

#### Properties

##### eur

> **eur**: `number`

Defined in: [core/src/vehiclePnl.ts:51](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/vehiclePnl.ts#L51)

##### vehicleId

> **vehicleId**: `string`

Defined in: [core/src/vehiclePnl.ts:50](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/vehiclePnl.ts#L50)

***

### VehicleCo2Row

Defined in: [core/src/co2.ts:36](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/co2.ts#L36)

#### Properties

##### co2Kg

> **co2Kg**: `number`

Defined in: [core/src/co2.ts:40](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/co2.ts#L40)

##### co2Per100Km

> **co2Per100Km**: `number` \| `null`

Defined in: [core/src/co2.ts:41](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/co2.ts#L41)

##### id

> **id**: `string`

Defined in: [core/src/co2.ts:37](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/co2.ts#L37)

##### liters

> **liters**: `number`

Defined in: [core/src/co2.ts:39](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/co2.ts#L39)

##### registration

> **registration**: `string`

Defined in: [core/src/co2.ts:38](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/co2.ts#L38)

***

### VehicleConsumption

Defined in: [core/src/insights.ts:17](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/insights.ts#L17)

#### Properties

##### avgConsumption

> **avgConsumption**: `number` \| `null`

Defined in: [core/src/insights.ts:20](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/insights.ts#L20)

Średnie spalanie l/100 km (null gdy brak danych — pomijany).

##### km

> **km**: `number`

Defined in: [core/src/insights.ts:22](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/insights.ts#L22)

Przebieg w okresie [km] (waży koszt odstępstwa).

##### registration

> **registration**: `string`

Defined in: [core/src/insights.ts:18](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/insights.ts#L18)

***

### VehicleCostEntry

Defined in: [core/src/profitability.ts:15](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/profitability.ts#L15)

#### Properties

##### cost

> **cost**: `number`

Defined in: [core/src/profitability.ts:18](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/profitability.ts#L18)

Koszt paliwa (€) zsumowany dla pojazdu w analizowanym okresie.

##### vehicleId

> **vehicleId**: `string`

Defined in: [core/src/profitability.ts:16](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/profitability.ts#L16)

***

### VehicleCostRecord

Defined in: [core/src/vehicleCosts.ts:31](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/vehicleCosts.ts#L31)

#### Properties

##### amountEur

> **amountEur**: `number`

Defined in: [core/src/vehicleCosts.ts:35](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/vehicleCosts.ts#L35)

Kwota w EUR (waluty inne niż EUR pomijamy w sumach P&L).

##### category

> **category**: `string`

Defined in: [core/src/vehicleCosts.ts:33](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/vehicleCosts.ts#L33)

##### vehicleId

> **vehicleId**: `string`

Defined in: [core/src/vehicleCosts.ts:32](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/vehicleCosts.ts#L32)

***

### VehicleFuelInput

Defined in: [core/src/co2.ts:27](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/co2.ts#L27)

#### Properties

##### consumption?

> `optional` **consumption?**: `number` \| `null`

Defined in: [core/src/co2.ts:33](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/co2.ts#L33)

Średnie spalanie L/100km (opcjonalnie, do intensywności).

##### id

> **id**: `string`

Defined in: [core/src/co2.ts:28](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/co2.ts#L28)

##### liters

> **liters**: `number`

Defined in: [core/src/co2.ts:31](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/co2.ts#L31)

Litry oleju napędowego w okresie.

##### registration

> **registration**: `string`

Defined in: [core/src/co2.ts:29](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/co2.ts#L29)

***

### VehiclePnl

Defined in: [core/src/vehiclePnl.ts:17](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/vehiclePnl.ts#L17)

#### Extended by

- [`VehiclePnlRow`](../api/core/src.md#vehiclepnlrow)

#### Properties

##### costs

> **costs**: `number`

Defined in: [core/src/vehiclePnl.ts:20](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/vehiclePnl.ts#L20)

##### fuel

> **fuel**: `number`

Defined in: [core/src/vehiclePnl.ts:19](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/vehiclePnl.ts#L19)

##### marginPct

> **marginPct**: `number` \| `null`

Defined in: [core/src/vehiclePnl.ts:24](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/vehiclePnl.ts#L24)

Marża netto w % przychodu; null gdy brak przychodu.

##### net

> **net**: `number`

Defined in: [core/src/vehiclePnl.ts:22](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/vehiclePnl.ts#L22)

Zysk = przychód − paliwo − koszty (może być ujemny).

##### revenue

> **revenue**: `number`

Defined in: [core/src/vehiclePnl.ts:18](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/vehiclePnl.ts#L18)

***

### VehiclePnlInput

Defined in: [core/src/vehiclePnl.ts:8](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/vehiclePnl.ts#L8)

#### Properties

##### costsEur

> **costsEur**: `number`

Defined in: [core/src/vehiclePnl.ts:14](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/vehiclePnl.ts#L14)

Pozostałe koszty pojazdu EUR (naprawy, leasing, ubezpieczenie…).

##### fuelEur

> **fuelEur**: `number`

Defined in: [core/src/vehiclePnl.ts:12](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/vehiclePnl.ts#L12)

Wydatek na paliwo (EUR).

##### revenueEur

> **revenueEur**: `number`

Defined in: [core/src/vehiclePnl.ts:10](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/vehiclePnl.ts#L10)

Przychód EUR (zlecenia dostarczone/zafakturowane).

***

### VehiclePnlRow

Defined in: [core/src/vehiclePnl.ts:54](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/vehiclePnl.ts#L54)

#### Extends

- [`VehiclePnl`](../api/core/src.md#vehiclepnl)

#### Properties

##### costs

> **costs**: `number`

Defined in: [core/src/vehiclePnl.ts:20](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/vehiclePnl.ts#L20)

###### Inherited from

[`VehiclePnl`](../api/core/src.md#vehiclepnl).[`costs`](../api/core/src.md#costs)

##### fuel

> **fuel**: `number`

Defined in: [core/src/vehiclePnl.ts:19](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/vehiclePnl.ts#L19)

###### Inherited from

[`VehiclePnl`](../api/core/src.md#vehiclepnl).[`fuel`](../api/core/src.md#fuel-3)

##### marginPct

> **marginPct**: `number` \| `null`

Defined in: [core/src/vehiclePnl.ts:24](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/vehiclePnl.ts#L24)

Marża netto w % przychodu; null gdy brak przychodu.

###### Inherited from

[`VehiclePnl`](../api/core/src.md#vehiclepnl).[`marginPct`](../api/core/src.md#marginpct-3)

##### net

> **net**: `number`

Defined in: [core/src/vehiclePnl.ts:22](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/vehiclePnl.ts#L22)

Zysk = przychód − paliwo − koszty (może być ujemny).

###### Inherited from

[`VehiclePnl`](../api/core/src.md#vehiclepnl).[`net`](../api/core/src.md#net-8)

##### revenue

> **revenue**: `number`

Defined in: [core/src/vehiclePnl.ts:18](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/vehiclePnl.ts#L18)

###### Inherited from

[`VehiclePnl`](../api/core/src.md#vehiclepnl).[`revenue`](../api/core/src.md#revenue-4)

##### vehicleId

> **vehicleId**: `string`

Defined in: [core/src/vehiclePnl.ts:55](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/vehiclePnl.ts#L55)

***

### WeeklyRestPlan

Defined in: [core/src/weeklyRest.ts:17](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/weeklyRest.ts#L17)

#### Properties

##### compensationDeadlineMs

> **compensationDeadlineMs**: `number` \| `null`

Defined in: [core/src/weeklyRest.ts:31](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/weeklyRest.ts#L31)

Termin oddania rekompensaty (koniec 3. tygodnia po skróconym).

##### compensationH

> **compensationH**: `number` \| `null`

Defined in: [core/src/weeklyRest.ts:29](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/weeklyRest.ts#L29)

Rekompensata za wariant skrócony [h] (45−24).

##### hoursUntilLatestStart

> **hoursUntilLatestStart**: `number`

Defined in: [core/src/weeklyRest.ts:21](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/weeklyRest.ts#L21)

Ile godzin od `nowMs` do najpóźniejszego startu (ujemne = po terminie).

##### latestStartMs

> **latestStartMs**: `number`

Defined in: [core/src/weeklyRest.ts:19](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/weeklyRest.ts#L19)

Najpóźniejszy start kolejnego odpoczynku tygodniowego (epoch ms).

##### mustBeRegular

> **mustBeRegular**: `boolean`

Defined in: [core/src/weeklyRest.ts:23](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/weeklyRest.ts#L23)

Poprzedni był skrócony → ten musi być regularny 45 h.

##### reducedEndMs

> **reducedEndMs**: `number` \| `null`

Defined in: [core/src/weeklyRest.ts:27](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/weeklyRest.ts#L27)

Wariant 24 h (null, gdy musi być regularny).

##### regularEndMs

> **regularEndMs**: `number`

Defined in: [core/src/weeklyRest.ts:25](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/weeklyRest.ts#L25)

Koniec odpoczynku przy starcie w ostatniej chwili — wariant 45 h.

***

### WeeklyRestPlanInput

Defined in: [core/src/weeklyRest.ts:11](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/weeklyRest.ts#L11)

#331: Planer odpoczynku tygodniowego (561/2006 art. 8) — czysty silnik:
• odpoczynek tygodniowy musi się ROZPOCZĄĆ najpóźniej po 6 dobach (144 h)
  od końca poprzedniego odpoczynku tygodniowego,
• regularny = 45 h, skrócony = min 24 h (rekompensata 21 h w jednym bloku,
  doczepiona do innego odpoczynku ≥9 h, do końca 3. tygodnia po skróconym),
• w dwóch kolejnych tygodniach co najmniej jeden regularny 45 h
  → po skróconym następny MUSI być regularny (uproszczenie bezpieczne).

#### Properties

##### lastType

> **lastType**: `"regular"` \| `"reduced"`

Defined in: [core/src/weeklyRest.ts:14](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/weeklyRest.ts#L14)

##### lastWeeklyRestEndMs

> **lastWeeklyRestEndMs**: `number`

Defined in: [core/src/weeklyRest.ts:13](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/weeklyRest.ts#L13)

Koniec ostatniego odpoczynku tygodniowego (epoch ms).

***

### WorkTimeDay

Defined in: [core/src/workTime.ts:23](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/workTime.ts#L23)

#### Extends

- [`WorkTimeEntry`](../api/core/src.md#worktimeentry)

#### Properties

##### date

> **date**: `string`

Defined in: [core/src/workTime.ts:14](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/workTime.ts#L14)

Data dnia (YYYY-MM-DD).

###### Inherited from

[`WorkTimeEntry`](../api/core/src.md#worktimeentry).[`date`](../api/core/src.md#date-7)

##### driving

> **driving**: `number`

Defined in: [core/src/workTime.ts:16](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/workTime.ts#L16)

Godziny jazdy.

###### Inherited from

[`WorkTimeEntry`](../api/core/src.md#worktimeentry).[`driving`](../api/core/src.md#driving-1)

##### otherWork

> **otherWork**: `number`

Defined in: [core/src/workTime.ts:18](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/workTime.ts#L18)

Inna praca (załadunek/rozładunek, formalności).

###### Inherited from

[`WorkTimeEntry`](../api/core/src.md#worktimeentry).[`otherWork`](../api/core/src.md#otherwork-1)

##### overDriving

> **overDriving**: `boolean`

Defined in: [core/src/workTime.ts:27](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/workTime.ts#L27)

Czy przekroczono dzienny limit jazdy.

##### rest

> **rest**: `number`

Defined in: [core/src/workTime.ts:20](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/workTime.ts#L20)

Odpoczynek / dyspozycyjność (informacyjnie).

###### Inherited from

[`WorkTimeEntry`](../api/core/src.md#worktimeentry).[`rest`](../api/core/src.md#rest-1)

##### workTotal

> **workTotal**: `number`

Defined in: [core/src/workTime.ts:25](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/workTime.ts#L25)

Praca łącznie = jazda + inna praca.

***

### WorkTimeEntry

Defined in: [core/src/workTime.ts:12](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/workTime.ts#L12)

#### Extended by

- [`WorkTimeDay`](../api/core/src.md#worktimeday)

#### Properties

##### date

> **date**: `string`

Defined in: [core/src/workTime.ts:14](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/workTime.ts#L14)

Data dnia (YYYY-MM-DD).

##### driving

> **driving**: `number`

Defined in: [core/src/workTime.ts:16](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/workTime.ts#L16)

Godziny jazdy.

##### otherWork

> **otherWork**: `number`

Defined in: [core/src/workTime.ts:18](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/workTime.ts#L18)

Inna praca (załadunek/rozładunek, formalności).

##### rest

> **rest**: `number`

Defined in: [core/src/workTime.ts:20](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/workTime.ts#L20)

Odpoczynek / dyspozycyjność (informacyjnie).

***

### WorkTimeReport

Defined in: [core/src/workTime.ts:42](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/workTime.ts#L42)

#### Properties

##### rows

> **rows**: [`WorkTimeDay`](../api/core/src.md#worktimeday)[]

Defined in: [core/src/workTime.ts:43](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/workTime.ts#L43)

##### summary

> **summary**: [`WorkTimeSummary`](../api/core/src.md#worktimesummary)

Defined in: [core/src/workTime.ts:44](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/workTime.ts#L44)

***

### WorkTimeSummary

Defined in: [core/src/workTime.ts:30](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/workTime.ts#L30)

#### Properties

##### avgDrivingPerDay

> **avgDrivingPerDay**: `number` \| `null`

Defined in: [core/src/workTime.ts:37](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/workTime.ts#L37)

Średnia jazda na dzień; null gdy brak dni.

##### days

> **days**: `number`

Defined in: [core/src/workTime.ts:31](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/workTime.ts#L31)

##### driving

> **driving**: `number`

Defined in: [core/src/workTime.ts:32](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/workTime.ts#L32)

##### otherWork

> **otherWork**: `number`

Defined in: [core/src/workTime.ts:33](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/workTime.ts#L33)

##### overDrivingDays

> **overDrivingDays**: `number`

Defined in: [core/src/workTime.ts:39](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/workTime.ts#L39)

Liczba dni z przekroczeniem limitu jazdy.

##### rest

> **rest**: `number`

Defined in: [core/src/workTime.ts:34](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/workTime.ts#L34)

##### workTotal

> **workTotal**: `number`

Defined in: [core/src/workTime.ts:35](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/workTime.ts#L35)

## Type Aliases

### AdblueLogInput

> **AdblueLogInput** = `z.infer`\<*typeof* [`adblueLogSchema`](../api/core/src.md#adbluelogschema)\>

Defined in: [core/src/schemas.ts:191](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/schemas.ts#L191)

***

### AlertKind

> **AlertKind** = `"negativeMargin"` \| `"lowMargin"` \| `"fuelAnomaly"` \| `"fuelSpike"`

Defined in: [core/src/alerts.ts:9](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/alerts.ts#L9)

***

### AlertSeverity

> **AlertSeverity** = `"critical"` \| `"warn"`

Defined in: [core/src/alerts.ts:8](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/alerts.ts#L8)

***

### AppModule

> **AppModule** = *typeof* [`APP_MODULES`](../api/core/src.md#app_modules)\[`number`\]

Defined in: [core/src/catalog.ts:64](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/catalog.ts#L64)

***

### ChecklistAnswers

> **ChecklistAnswers** = `Record`\<`string`, [`ChecklistAnswer`](../api/core/src.md#checklistanswer)\>

Defined in: [core/src/checklists.ts:28](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/checklists.ts#L28)

***

### ChecklistItemType

> **ChecklistItemType** = `"yesno"` \| `"multi"`

Defined in: [core/src/checklists.ts:7](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/checklists.ts#L7)

Checklisty kierowców (#273) — typy współdzielone web↔mobile + domyślne
szablony firmy (wzorce właściciela: „Wjazd do UK" i „Tachograf").
Szablon per FIRMA — owner/dispatcher edytuje pozycje pod własne procedury.

***

### CsvCell

> **CsvCell** = `string` \| `number` \| `boolean` \| `null` \| `undefined`

Defined in: [core/src/csv.ts:6](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/csv.ts#L6)

Generowanie CSV (RFC 4180) z domyślnym separatorem `;` (Excel PL).
Funkcje czyste — bez zależności od przeglądarki (pobranie pliku robi warstwa web).

***

### DamageKind

> **DamageKind** = *typeof* [`DAMAGE_KINDS`](../api/core/src.md#damage_kinds)\[`number`\]

Defined in: [core/src/damageClaims.ts:32](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/damageClaims.ts#L32)

***

### DamageStatus

> **DamageStatus** = *typeof* [`DAMAGE_STATUSES`](../api/core/src.md#damage_statuses)\[`number`\]

Defined in: [core/src/damageClaims.ts:14](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/damageClaims.ts#L14)

***

### DddActivity

> **DddActivity** = `"rest"` \| `"availability"` \| `"work"` \| `"driving"`

Defined in: [core/src/ddd.ts:14](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/ddd.ts#L14)

#328: Parser odczytu karty kierowcy (.ddd / .esm) — Gen1 i Gen2.
Czyta bloki TLV pliku pobrania (FID + typ + długość), wyciąga
EF_Identification (imię i nazwisko posiadacza) oraz
EF_Driver_Activity_Data (bufor cykliczny dziennych rejestrów aktywności)
i zamienia je na dni z minutami jazdy/pracy/dyspozycji/odpoczynku
+ wykrywa naruszenia 561/2006 (jazda ciągła >4h30, dobowa >9h/10h).

Struktury wg zał. 1B/1C rozporządzenia 3821/85 / 165/2014 (ESM).
Parser jest TOLERANCYJNY: nieznane bloki pomija, uszkodzone rekordy
ucina — zawsze zwraca to, co dało się odczytać.

***

### DefectInput

> **DefectInput** = `z.infer`\<*typeof* [`defectSchema`](../api/core/src.md#defectschema)\>

Defined in: [core/src/schemas.ts:166](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/schemas.ts#L166)

***

### DefectSeverity

> **DefectSeverity** = *typeof* [`DEFECT_SEVERITIES`](../api/core/src.md#defect_severities)\[`number`\]

Defined in: [core/src/enums.ts:101](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/enums.ts#L101)

***

### DefectStatus

> **DefectStatus** = *typeof* [`DEFECT_STATUSES`](../api/core/src.md#defect_statuses)\[`number`\]

Defined in: [core/src/enums.ts:105](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/enums.ts#L105)

***

### DietMode

> **DietMode** = `"domestic"` \| `"foreign"`

Defined in: [core/src/perDiem.ts:15](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/perDiem.ts#L15)

***

### DriverInput

> **DriverInput** = `z.infer`\<*typeof* [`driverSchema`](../api/core/src.md#driverschema)\>

Defined in: [core/src/schemas.ts:133](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/schemas.ts#L133)

***

### ExpiryLevel

> **ExpiryLevel** = `"expired"` \| `"soon"` \| `"ok"`

Defined in: [core/src/expiry.ts:3](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/expiry.ts#L3)

Status ważności dokumentów pojazdu (przegląd/OC/leasing). Funkcje czyste.

***

### FleetVehicleState

> **FleetVehicleState** = `"driving"` \| `"planned"` \| `"idle"`

Defined in: [core/src/fleet.ts:6](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/fleet.ts#L6)

Status floty „na żywo" — agregacja stanu pojazdów na podstawie zleceń i zdarzeń trasy.
Funkcje czyste (bez I/O). Kolejność wejściowych zleceń/zdarzeń: od najnowszego.

***

### FuelCardInput

> **FuelCardInput** = `z.infer`\<*typeof* [`fuelCardSchema`](../api/core/src.md#fuelcardschema)\>

Defined in: [core/src/schemas.ts:83](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/schemas.ts#L83)

***

### FuelCardProvider

> **FuelCardProvider** = *typeof* [`FUEL_CARD_PROVIDERS`](../api/core/src.md#fuel_card_providers)\[`number`\]

Defined in: [core/src/enums.ts:63](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/enums.ts#L63)

***

### FuelLogInput

> **FuelLogInput** = `z.infer`\<*typeof* [`fuelLogSchema`](../api/core/src.md#fuellogschema)\>

Defined in: [core/src/schemas.ts:187](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/schemas.ts#L187)

***

### GeoLocation

> **GeoLocation** = `z.infer`\<*typeof* [`geoLocationSchema`](../api/core/src.md#geolocationschema)\>

Defined in: [core/src/schemas.ts:30](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/schemas.ts#L30)

***

### MapReportInput

> **MapReportInput** = `z.infer`\<*typeof* [`mapReportSchema`](../api/core/src.md#mapreportschema)\>

Defined in: [core/src/schemas.ts:264](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/schemas.ts#L264)

***

### MemberPermissions

> **MemberPermissions** = `Partial`\<`Record`\<[`AppModule`](../api/core/src.md#appmodule), [`PermissionLevel`](../api/core/src.md#permissionlevel)\>\>

Defined in: [core/src/catalog.ts:387](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/catalog.ts#L387)

***

### OrderCostMethod

> **OrderCostMethod** = `"perKm"` \| `"none"`

Defined in: [core/src/orderCost.ts:36](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/orderCost.ts#L36)

***

### OrderInput

> **OrderInput** = `z.infer`\<*typeof* [`orderSchema`](../api/core/src.md#orderschema)\>

Defined in: [core/src/schemas.ts:153](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/schemas.ts#L153)

***

### OrderSort

> **OrderSort** = *typeof* [`ORDER_SORTS`](../api/core/src.md#order_sorts)\[`number`\]

Defined in: [core/src/orderFilter.ts:20](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/orderFilter.ts#L20)

***

### OrderStatus

> **OrderStatus** = *typeof* [`ORDER_STATUSES`](../api/core/src.md#order_statuses)\[`number`\]

Defined in: [core/src/catalog.ts:144](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/catalog.ts#L144)

***

### PaymentMethod

> **PaymentMethod** = *typeof* [`PAYMENT_METHODS`](../api/core/src.md#payment_methods)\[`number`\]

Defined in: [core/src/enums.ts:28](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/enums.ts#L28)

***

### PaymentStatus

> **PaymentStatus** = `"paid"` \| `"overdue"` \| `"unpaid"`

Defined in: [core/src/invoice.ts:4](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/invoice.ts#L4)

***

### PayoutKind

> **PayoutKind** = *typeof* [`PAYOUT_KINDS`](../api/core/src.md#payout_kinds)\[`number`\]

Defined in: [core/src/payouts.ts:9](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/payouts.ts#L9)

***

### PermissionLevel

> **PermissionLevel** = *typeof* [`PERMISSION_LEVELS`](../api/core/src.md#permission_levels)\[`number`\]

Defined in: [core/src/catalog.ts:386](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/catalog.ts#L386)

***

### PhotoCategory

> **PhotoCategory** = *typeof* [`PHOTO_CATEGORIES`](../api/core/src.md#photo_categories)\[`number`\]

Defined in: [core/src/photoCategories.ts:10](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/photoCategories.ts#L10)

***

### PhotoKind

> **PhotoKind** = *typeof* [`PHOTO_KINDS`](../api/core/src.md#photo_kinds)\[`number`\]

Defined in: [core/src/photoCategories.ts:23](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/photoCategories.ts#L23)

***

### PoiType

> **PoiType** = *typeof* [`POI_TYPES`](../api/core/src.md#poi_types)\[`number`\]

Defined in: [core/src/enums.ts:97](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/enums.ts#L97)

***

### ReportType

> **ReportType** = *typeof* [`REPORT_TYPES`](../api/core/src.md#report_types)\[`number`\]

Defined in: [core/src/enums.ts:116](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/enums.ts#L116)

***

### RestType

> **RestType** = `"daily-regular"` \| `"daily-reduced"` \| `"weekly-regular"` \| `"weekly-reduced"`

Defined in: [core/src/tachoTime.ts:19](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/tachoTime.ts#L19)

***

### Role

> **Role** = *typeof* [`ROLES`](../api/core/src.md#roles)\[`number`\]

Defined in: [core/src/enums.ts:7](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/enums.ts#L7)

***

### SavedPlaceCategory

> **SavedPlaceCategory** = *typeof* [`SAVED_PLACE_CATEGORIES`](../api/core/src.md#saved_place_categories)\[`number`\]

Defined in: [core/src/savedPlaces.ts:15](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/savedPlaces.ts#L15)

***

### TrailerType

> **TrailerType** = *typeof* [`TRAILER_TYPES`](../api/core/src.md#trailer_types)\[`number`\]

Defined in: [core/src/enums.ts:25](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/enums.ts#L25)

***

### TripAction

> **TripAction** = *typeof* [`TRIP_ACTIONS`](../api/core/src.md#trip_actions)\[`number`\]

Defined in: [core/src/enums.ts:40](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/enums.ts#L40)

***

### TripEventInput

> **TripEventInput** = `z.infer`\<*typeof* [`tripEventSchema`](../api/core/src.md#tripeventschema)\>

Defined in: [core/src/schemas.ts:254](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/schemas.ts#L254)

***

### VehicleCostCategory

> **VehicleCostCategory** = *typeof* [`VEHICLE_COST_CATEGORIES`](../api/core/src.md#vehicle_cost_categories)\[`number`\]

Defined in: [core/src/vehicleCosts.ts:18](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/vehicleCosts.ts#L18)

***

### VehicleCostInput

> **VehicleCostInput** = `z.infer`\<*typeof* [`vehicleCostSchema`](../api/core/src.md#vehiclecostschema)\>

Defined in: [core/src/schemas.ts:95](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/schemas.ts#L95)

***

### VehicleInput

> **VehicleInput** = `z.infer`\<*typeof* [`vehicleSchema`](../api/core/src.md#vehicleschema)\>

Defined in: [core/src/schemas.ts:65](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/schemas.ts#L65)

***

### VehicleType

> **VehicleType** = *typeof* [`VEHICLE_TYPES`](../api/core/src.md#vehicle_types)\[`number`\]

Defined in: [core/src/enums.ts:10](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/enums.ts#L10)

## Variables

### adblueLogSchema

> `const` **adblueLogSchema**: `ZodObject`\<\{ `comment`: `ZodOptional`\<`ZodString`\>; `fuelCardId`: `ZodOptional`\<`ZodUUID`\>; `isFull`: `ZodDefault`\<`ZodBoolean`\>; `liters`: `ZodNumber`; `odometerKm`: `ZodNumber`; `paymentMethod`: `ZodEnum`\<\{ `card`: `"card"`; `cash`: `"cash"`; \}\>; `priceTotal`: `ZodOptional`\<`ZodNumber`\>; `station`: `ZodObject`\<\{ `city`: `ZodOptional`\<`ZodString`\>; `company`: `ZodOptional`\<`ZodString`\>; `country`: `ZodString`; `lat`: `ZodOptional`\<`ZodNumber`\>; `lng`: `ZodOptional`\<`ZodNumber`\>; `location`: `ZodOptional`\<`ZodString`\>; `postcode`: `ZodOptional`\<`ZodString`\>; \}, `$strip`\>; `vehicleId`: `ZodUUID`; \}, `$strip`\> = `fuelLogSchema`

Defined in: [core/src/schemas.ts:190](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/schemas.ts#L190)

AdBlue — identyczna struktura jak paliwo (pole `liters` = AdBlue).

***

### AETR\_LIMITS

> `const` **AETR\_LIMITS**: `object`

Defined in: [core/src/aetr.ts:14](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/aetr.ts#L14)

Limity 561/2006 (minuty).

#### Type Declaration

##### continuousDriving

> `readonly` **continuousDriving**: `number`

##### dailyDriving

> `readonly` **dailyDriving**: `number`

##### dailyDrivingExtended

> `readonly` **dailyDrivingExtended**: `number`

##### dailyRest

> `readonly` **dailyRest**: `number`

##### dailyRestReduced

> `readonly` **dailyRestReduced**: `number`

##### extendedPerWeek

> `readonly` **extendedPerWeek**: `2` = `2`

##### firstSplitBreak

> `readonly` **firstSplitBreak**: `number`

##### fullBreak

> `readonly` **fullBreak**: `number`

##### reducedDailyRests

> `readonly` **reducedDailyRests**: `3` = `3`

##### secondSplitBreak

> `readonly` **secondSplitBreak**: `number`

##### twoWeekDriving

> `readonly` **twoWeekDriving**: `number`

##### weeklyDriving

> `readonly` **weeklyDriving**: `number`

##### weeklyRest

> `readonly` **weeklyRest**: `number`

##### weeklyRestReduced

> `readonly` **weeklyRestReduced**: `number`

***

### APP\_MODULE\_LABELS

> `const` **APP\_MODULE\_LABELS**: `Record`\<[`AppModule`](../api/core/src.md#appmodule), `string`\>

Defined in: [core/src/catalog.ts:67](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/catalog.ts#L67)

Czytelne nazwy modułów (UI).

***

### APP\_MODULES

> `const` **APP\_MODULES**: readonly \[`"vehicles"`, `"drivers"`, `"cards"`, `"forms"`, `"reports"`, `"map"`, `"stats"`, `"settlements"`, `"orders"`, `"checklists"`, `"documents"`, `"damages"`\]

Defined in: [core/src/catalog.ts:50](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/catalog.ts#L50)

Moduły aplikacji, do których właściciel nadaje dostęp członkom.

***

### DAMAGE\_KIND\_LABELS

> `const` **DAMAGE\_KIND\_LABELS**: `Record`\<[`DamageKind`](../api/core/src.md#damagekind), `string`\>

Defined in: [core/src/damageClaims.ts:34](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/damageClaims.ts#L34)

***

### DAMAGE\_KINDS

> `const` **DAMAGE\_KINDS**: readonly \[`"collision"`, `"theft"`, `"glass"`, `"weather"`, `"vandalism"`, `"other"`\]

Defined in: [core/src/damageClaims.ts:24](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/damageClaims.ts#L24)

***

### DAMAGE\_STATUS\_LABELS

> `const` **DAMAGE\_STATUS\_LABELS**: `Record`\<[`DamageStatus`](../api/core/src.md#damagestatus), `string`\>

Defined in: [core/src/damageClaims.ts:16](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/damageClaims.ts#L16)

***

### DAMAGE\_STATUSES

> `const` **DAMAGE\_STATUSES**: readonly \[`"reported"`, `"in_progress"`, `"repaired"`, `"closed"`, `"rejected"`\]

Defined in: [core/src/damageClaims.ts:7](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/damageClaims.ts#L7)

***

### DEFAULT\_CHECKLIST\_TEMPLATES

> `const` **DEFAULT\_CHECKLIST\_TEMPLATES**: `object`[]

Defined in: [core/src/checklists.ts:39](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/checklists.ts#L39)

Domyślne szablony — seed do skopiowania przez firmę (edytowalne po dodaniu).

#### Type Declaration

##### items

> **items**: [`ChecklistItem`](../api/core/src.md#checklistitem)[]

##### name

> **name**: `string`

***

### DEFAULT\_DAILY\_DRIVING\_LIMIT

> `const` **DEFAULT\_DAILY\_DRIVING\_LIMIT**: `10` = `10`

Defined in: [core/src/workTime.ts:10](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/workTime.ts#L10)

Domyślny dzienny limit jazdy do oznaczania przekroczeń (UE: maks. 10 h).

***

### DEFAULT\_MODULES

> `const` **DEFAULT\_MODULES**: `Record`\<`string`, [`AppModule`](../api/core/src.md#appmodule)[]\>

Defined in: [core/src/catalog.ts:83](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/catalog.ts#L83)

Domyślny zestaw modułów wg roli (gdy członek nie ma własnego `modules`).

***

### DEFAULT\_PHOTO\_CATEGORY

> `const` **DEFAULT\_PHOTO\_CATEGORY**: [`PhotoCategory`](../api/core/src.md#photocategory) = `"Towar"`

Defined in: [core/src/photoCategories.ts:11](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/photoCategories.ts#L11)

***

### DEFAULT\_SETTLEMENT\_SETTINGS

> `const` **DEFAULT\_SETTLEMENT\_SETTINGS**: [`SettlementSettings`](../api/core/src.md#settlementsettings)

Defined in: [core/src/driverSettlement.ts:25](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/driverSettlement.ts#L25)

***

### DEFECT\_KEYWORDS

> `const` **DEFECT\_KEYWORDS**: `object`[]

Defined in: [core/src/catalog.ts:191](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/catalog.ts#L191)

Mapowanie słów-kluczy z opisu kierowcy → układ pojazdu (auto-podświetlenie na schemacie).
Dopasowanie po fragmencie (lowercase).

#### Type Declaration

##### match

> **match**: `string`[]

##### part

> **part**: `string`

***

### DEFECT\_PARTS

> `const` **DEFECT\_PARTS**: readonly \[`"Hamulce (klocki/tarcze)"`, `"Opony / koła"`, `"Zawieszenie"`, `"Światła"`, `"Lusterka / szyby"`, `"Silnik"`, `"Skrzynia biegów"`, `"Układ AdBlue / wydech"`, `"Elektryka"`, `"Kabina / wnętrze"`, `"Naczepa / zabudowa"`, `"Inne"`\]

Defined in: [core/src/catalog.ts:161](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/catalog.ts#L161)

Układy/części pojazdu do zgłaszania usterek.

***

### DEFECT\_SEVERITIES

> `const` **DEFECT\_SEVERITIES**: readonly \[`"low"`, `"medium"`, `"high"`\]

Defined in: [core/src/enums.ts:100](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/enums.ts#L100)

Pilność usterki pojazdu.

***

### DEFECT\_SIDES

> `const` **DEFECT\_SIDES**: readonly \[`"lewa"`, `"prawa"`, `"przód"`, `"tył"`, `"oś przednia"`, `"oś tylna"`, `"—"`\]

Defined in: [core/src/catalog.ts:177](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/catalog.ts#L177)

Strona/umiejscowienie usterki.

***

### DEFECT\_STATUSES

> `const` **DEFECT\_STATUSES**: readonly \[`"open"`, `"in_progress"`, `"resolved"`\]

Defined in: [core/src/enums.ts:104](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/enums.ts#L104)

Status usterki (workflow: zgłoszone → w naprawie → naprawione).

***

### defectSchema

> `const` **defectSchema**: `ZodObject`\<\{ `dashboardLight`: `ZodDefault`\<`ZodBoolean`\>; `description`: `ZodString`; `part`: `ZodString`; `severity`: `ZodDefault`\<`ZodEnum`\<\{ `high`: `"high"`; `low`: `"low"`; `medium`: `"medium"`; \}\>\>; `side`: `ZodOptional`\<`ZodString`\>; `status`: `ZodDefault`\<`ZodEnum`\<\{ `in_progress`: `"in_progress"`; `open`: `"open"`; `resolved`: `"resolved"`; \}\>\>; `vehicleId`: `ZodUUID`; \}, `$strip`\>

Defined in: [core/src/schemas.ts:157](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/schemas.ts#L157)

***

### DIESEL\_CO2\_KG\_PER\_L

> `const` **DIESEL\_CO2\_KG\_PER\_L**: `2.64` = `2.64`

Defined in: [core/src/co2.ts:9](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/co2.ts#L9)

Emisja CO₂ ze spalania litra oleju napędowego (tank-to-wheel), kg/L.

***

### DOCUMENT\_CATEGORIES

> `const` **DOCUMENT\_CATEGORIES**: readonly \[`"OC / ubezpieczenie"`, `"Przegląd techniczny"`, `"Leasing / umowa"`, `"Dowód rejestracyjny"`, `"Licencja / zezwolenie"`, `"Umowa przewozu"`, `"Faktura / rachunek"`, `"CMR / list przewozowy"`, `"Tachograf"`, `"Inne"`\]

Defined in: [core/src/catalog.ts:147](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/catalog.ts#L147)

Kategorie dokumentów w sejfie (Storage). Wartość = string (rozszerzalne).

***

### DRIVER\_QUALIFICATIONS

> `const` **DRIVER\_QUALIFICATIONS**: readonly \[`"Kod 95 (kwalifikacja zawodowa)"`, `"Karta kierowcy (tachograf)"`, `"ADR podstawowy"`, `"ADR cysterny"`, `"ADR klasa 1 (wybuchowe)"`, `"ADR klasa 7 (promieniotwórcze)"`, `"Wózki widłowe (UDT)"`, `"HDS / żuraw przeładunkowy"`, `"Żuraw samojezdny"`, `"Koparko-ładowarka"`, `"Świadectwo kwalifikacji"`, `"Pierwsza pomoc"`\]

Defined in: [core/src/catalog.ts:120](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/catalog.ts#L120)

Dodatkowe uprawnienia kierowcy (rozszerzalne — można dopisać własne).

***

### driverSchema

> `const` **driverSchema**: `ZodObject`\<\{ `adrExpiry`: `ZodOptional`\<`ZodString`\>; `birthDate`: `ZodOptional`\<`ZodString`\>; `code95Expiry`: `ZodOptional`\<`ZodString`\>; `firstName`: `ZodString`; `idCardExpiry`: `ZodOptional`\<`ZodString`\>; `idCardNumber`: `ZodOptional`\<`ZodString`\>; `lastName`: `ZodString`; `licenseCategories`: `ZodDefault`\<`ZodArray`\<`ZodString`\>\>; `licenseExpiry`: `ZodOptional`\<`ZodString`\>; `licenseNumber`: `ZodOptional`\<`ZodString`\>; `medicalExpiry`: `ZodOptional`\<`ZodString`\>; `notes`: `ZodOptional`\<`ZodString`\>; `passportExpiry`: `ZodOptional`\<`ZodString`\>; `passportNumber`: `ZodOptional`\<`ZodString`\>; `psychotechExpiry`: `ZodOptional`\<`ZodString`\>; `qualificationDetails`: `ZodDefault`\<`ZodArray`\<`ZodObject`\<\{ `docNumber`: `ZodOptional`\<`ZodString`\>; `expiry`: `ZodOptional`\<`ZodString`\>; `name`: `ZodString`; \}, `$strip`\>\>\>; `qualifications`: `ZodDefault`\<`ZodArray`\<`ZodString`\>\>; \}, `$strip`\>

Defined in: [core/src/schemas.ts:99](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/schemas.ts#L99)

***

### FREIGHT\_EXPORT\_HEADERS

> `const` **FREIGHT\_EXPORT\_HEADERS**: readonly \[`"Referencja"`, `"Załadunek"`, `"Data załadunku"`, `"Rozładunek"`, `"Data rozładunku"`, `"Ładunek"`, `"Waga (t)"`, `"Stawka"`, `"Waluta"`, `"Uwagi"`\]

Defined in: [core/src/freightExport.ts:39](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/freightExport.ts#L39)

Nagłówki kolumn CSV (kolejność = `freightRowCells`).

***

### FUEL\_CARD\_PROVIDER\_LABELS

> `const` **FUEL\_CARD\_PROVIDER\_LABELS**: `Record`\<[`FuelCardProvider`](../api/core/src.md#fuelcardprovider), `string`\>

Defined in: [core/src/enums.ts:66](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/enums.ts#L66)

Czytelne nazwy marek kart (do UI). Brak wpisu → wersja wielkimi literami.

***

### FUEL\_CARD\_PROVIDERS

> `const` **FUEL\_CARD\_PROVIDERS**: readonly \[`"dkv"`, `"eurowag"`, `"shell"`, `"bp"`, `"circlek"`, `"e100"`, `"uta"`, `"as24"`, `"aral"`, `"omv"`, `"routex"`, `"logpay"`, `"esso"`, `"totalenergies"`, `"tankpool24"`, `"morganfuels"`, `"iqcard"`, `"other"`\]

Defined in: [core/src/enums.ts:43](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/enums.ts#L43)

Wykaz dostawców kart paliwowych (rozszerzalny).

***

### FUEL\_CARD\_STATION\_BRANDS

> `const` **FUEL\_CARD\_STATION\_BRANDS**: `Record`\<[`FuelCardProvider`](../api/core/src.md#fuelcardprovider), `string`[]\>

Defined in: [core/src/catalog.ts:220](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/catalog.ts#L220)

Orientacyjne marki stacji akceptujących daną kartę flotową (słowa-klucze,
dopasowanie po fragmencie do tagów OSM `brand`/`operator`/`name`).
UWAGA: sieci akceptacji są ogromne i zmienne — to filtr **poglądowy**,
nie wiążąca lista akceptacji (do tego potrzebne są API partnerów).

***

### fuelCardSchema

> `const` **fuelCardSchema**: `ZodObject`\<\{ `cardNumberMasked`: `ZodString`; `discountPercent`: `ZodDefault`\<`ZodNumber`\>; `notes`: `ZodOptional`\<`ZodString`\>; `pin`: `ZodOptional`\<`ZodString`\>; `provider`: `ZodEnum`\<\{ `aral`: `"aral"`; `as24`: `"as24"`; `bp`: `"bp"`; `circlek`: `"circlek"`; `dkv`: `"dkv"`; `e100`: `"e100"`; `esso`: `"esso"`; `eurowag`: `"eurowag"`; `iqcard`: `"iqcard"`; `logpay`: `"logpay"`; `morganfuels`: `"morganfuels"`; `omv`: `"omv"`; `other`: `"other"`; `routex`: `"routex"`; `shell`: `"shell"`; `tankpool24`: `"tankpool24"`; `totalenergies`: `"totalenergies"`; `uta`: `"uta"`; \}\>; `validUntil`: `ZodOptional`\<`ZodString`\>; `vehicleId`: `ZodOptional`\<`ZodUUID`\>; \}, `$strip`\>

Defined in: [core/src/schemas.ts:69](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/schemas.ts#L69)

***

### fuelLogSchema

> `const` **fuelLogSchema**: `ZodObject`\<\{ `comment`: `ZodOptional`\<`ZodString`\>; `fuelCardId`: `ZodOptional`\<`ZodUUID`\>; `isFull`: `ZodDefault`\<`ZodBoolean`\>; `liters`: `ZodNumber`; `odometerKm`: `ZodNumber`; `paymentMethod`: `ZodEnum`\<\{ `card`: `"card"`; `cash`: `"cash"`; \}\>; `priceTotal`: `ZodOptional`\<`ZodNumber`\>; `station`: `ZodObject`\<\{ `city`: `ZodOptional`\<`ZodString`\>; `company`: `ZodOptional`\<`ZodString`\>; `country`: `ZodString`; `lat`: `ZodOptional`\<`ZodNumber`\>; `lng`: `ZodOptional`\<`ZodNumber`\>; `location`: `ZodOptional`\<`ZodString`\>; `postcode`: `ZodOptional`\<`ZodString`\>; \}, `$strip`\>; `vehicleId`: `ZodUUID`; \}, `$strip`\>

Defined in: [core/src/schemas.ts:170](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/schemas.ts#L170)

***

### geoLocationSchema

> `const` **geoLocationSchema**: `ZodObject`\<\{ `city`: `ZodOptional`\<`ZodString`\>; `company`: `ZodOptional`\<`ZodString`\>; `country`: `ZodString`; `lat`: `ZodOptional`\<`ZodNumber`\>; `lng`: `ZodOptional`\<`ZodNumber`\>; `location`: `ZodOptional`\<`ZodString`\>; `postcode`: `ZodOptional`\<`ZodString`\>; \}, `$strip`\>

Defined in: [core/src/schemas.ts:19](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/schemas.ts#L19)

Lokalizacja: kraj + miejsce, opcjonalnie współrzędne GPS (auto lub ręcznie).

***

### INSURERS

> `const` **INSURERS**: readonly \[`"PZU"`, `"Warta"`, `"Allianz"`, `"Ergo Hestia"`, `"Generali"`, `"Uniqa"`, `"Link4"`, `"TUZ"`, `"Compensa"`, `"InterRisk"`, `"Wiener"`, `"Beesafe"`, `"Benefia"`, `"Balcia"`, `"Trasti"`, `"mtu24"`\]

Defined in: [core/src/catalog.ts:361](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/catalog.ts#L361)

Ubezpieczyciele komunikacyjni (PL) — do listy przy OC pojazdu.

***

### LICENSE\_CATEGORIES

> `const` **LICENSE\_CATEGORIES**: readonly \[`"AM"`, `"A1"`, `"A2"`, `"A"`, `"B1"`, `"B"`, `"B+E"`, `"C1"`, `"C1+E"`, `"C"`, `"C+E"`, `"D1"`, `"D1+E"`, `"D"`, `"D+E"`, `"T"`\]

Defined in: [core/src/catalog.ts:100](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/catalog.ts#L100)

Kategorie prawa jazdy (PL).

***

### mapReportSchema

> `const` **mapReportSchema**: `ZodObject`\<\{ `comment`: `ZodOptional`\<`ZodString`\>; `lat`: `ZodNumber`; `lng`: `ZodNumber`; `type`: `ZodEnum`\<\{ `accident`: `"accident"`; `closure`: `"closure"`; `hazard`: `"hazard"`; `police`: `"police"`; `traffic`: `"traffic"`; `weigh`: `"weigh"`; \}\>; \}, `$strip`\>

Defined in: [core/src/schemas.ts:258](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/schemas.ts#L258)

***

### ORDER\_SORTS

> `const` **ORDER\_SORTS**: readonly \[`"date_desc"`, `"date_asc"`, `"price_desc"`, `"price_asc"`\]

Defined in: [core/src/orderFilter.ts:19](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/orderFilter.ts#L19)

***

### ORDER\_STATUSES

> `const` **ORDER\_STATUSES**: readonly \[`"new"`, `"assigned"`, `"in_progress"`, `"delivered"`, `"invoiced"`, `"cancelled"`\]

Defined in: [core/src/catalog.ts:136](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/catalog.ts#L136)

Statusy zlecenia transportowego.

***

### orderSchema

> `const` **orderSchema**: `ZodObject`\<\{ `assignedTo`: `ZodOptional`\<`ZodString`\>; `cargo`: `ZodOptional`\<`ZodString`\>; `consignee`: `ZodOptional`\<`ZodString`\>; `currency`: `ZodDefault`\<`ZodString`\>; `destination`: `ZodOptional`\<`ZodString`\>; `loadDate`: `ZodOptional`\<`ZodString`\>; `notes`: `ZodOptional`\<`ZodString`\>; `origin`: `ZodOptional`\<`ZodString`\>; `price`: `ZodOptional`\<`ZodNumber`\>; `referenceNo`: `ZodOptional`\<`ZodString`\>; `shipper`: `ZodOptional`\<`ZodString`\>; `unloadDate`: `ZodOptional`\<`ZodString`\>; `vehicleId`: `ZodOptional`\<`ZodString`\>; `weightKg`: `ZodOptional`\<`ZodNumber`\>; \}, `$strip`\>

Defined in: [core/src/schemas.ts:137](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/schemas.ts#L137)

***

### PAYMENT\_METHODS

> `const` **PAYMENT\_METHODS**: readonly \[`"card"`, `"cash"`\]

Defined in: [core/src/enums.ts:27](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/enums.ts#L27)

***

### PAYOUT\_KIND\_LABELS

> `const` **PAYOUT\_KIND\_LABELS**: `Record`\<[`PayoutKind`](../api/core/src.md#payoutkind), `string`\>

Defined in: [core/src/payouts.ts:11](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/payouts.ts#L11)

***

### PAYOUT\_KINDS

> `const` **PAYOUT\_KINDS**: readonly \[`"due"`, `"advance"`, `"deduction"`, `"payout"`\]

Defined in: [core/src/payouts.ts:8](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/payouts.ts#L8)

***

### PERMISSION\_LEVELS

> `const` **PERMISSION\_LEVELS**: readonly \[`"none"`, `"view"`, `"edit"`\]

Defined in: [core/src/catalog.ts:385](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/catalog.ts#L385)

***

### PHOTO\_CATEGORIES

> `const` **PHOTO\_CATEGORIES**: readonly \[`"Towar"`, `"CMR"`, `"Dokument"`, `"Inne"`\]

Defined in: [core/src/photoCategories.ts:9](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/photoCategories.ts#L9)

Kategorie załączników zlecenia (#248) — zapisywane w `order_photos.caption`.
POD (podpis odbiorcy / e-CMR) ma osobny, strukturalny format captiona (patrz `pod.ts`);
kategorie to zwykły tekst, więc `isPodCaption` ich nie myli. Domyślna „Towar" zapisywana
jest bez captiona (spójność ze starymi zdjęciami), pozostałe jako etykieta w `caption`.

***

### PHOTO\_KIND\_LABEL

> `const` **PHOTO\_KIND\_LABEL**: `Record`\<[`PhotoKind`](../api/core/src.md#photokind), `string`\>

Defined in: [core/src/photoCategories.ts:26](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/photoCategories.ts#L26)

Etykiety PL typów (do badge'y i chipów filtra).

***

### PHOTO\_KINDS

> `const` **PHOTO\_KINDS**: readonly \[`"cargo"`, `"cmr"`, `"document"`, `"other"`, `"pod"`\]

Defined in: [core/src/photoCategories.ts:22](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/photoCategories.ts#L22)

Maszynowe typy załącznika (slug). Zgodne z kolumną generowaną `order_photos.kind`.

***

### POD\_CAPTION\_PREFIX

> `const` **POD\_CAPTION\_PREFIX**: `"POD"` = `"POD"`

Defined in: [core/src/pod.ts:10](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/pod.ts#L10)

Prefiks oznaczający, że załącznik jest podpisem odbiorcy (POD).

***

### POI\_TYPES

> `const` **POI\_TYPES**: readonly \[`"parking"`, `"fuel_station"`, `"ferry"`, `"airport"`, `"company"`, `"wash"`, `"weigh"`\]

Defined in: [core/src/enums.ts:88](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/enums.ts#L88)

Typy punktów POI na mapie.

***

### REPORT\_TYPES

> `const` **REPORT\_TYPES**: readonly \[`"accident"`, `"police"`, `"closure"`, `"traffic"`, `"weigh"`, `"hazard"`\]

Defined in: [core/src/enums.ts:108](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/enums.ts#L108)

Typy zgłoszeń społecznościowych (warstwa realtime).

***

### ROLES

> `const` **ROLES**: readonly \[`"developer"`, `"owner"`, `"dispatcher"`, `"driver"`\]

Defined in: [core/src/enums.ts:6](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/enums.ts#L6)

Enumy domenowe E-Logistic. Definiowane jako `as const` tuple,
by współdzielić je między Zod (runtime) a typami (compile-time).

***

### SAVED\_PLACE\_CATEGORIES

> `const` **SAVED\_PLACE\_CATEGORIES**: readonly \[`"fuel_station"`, `"port"`, `"customs"`, `"company"`, `"parking"`, `"other"`\]

Defined in: [core/src/savedPlaces.ts:7](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/savedPlaces.ts#L7)

***

### SAVED\_PLACE\_CATEGORY\_LABELS

> `const` **SAVED\_PLACE\_CATEGORY\_LABELS**: `Record`\<[`SavedPlaceCategory`](../api/core/src.md#savedplacecategory), `string`\>

Defined in: [core/src/savedPlaces.ts:17](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/savedPlaces.ts#L17)

***

### SEARCH\_MIN\_CHARS

> `const` **SEARCH\_MIN\_CHARS**: `2` = `2`

Defined in: [core/src/search.ts:20](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/search.ts#L20)

Minimalna długość frazy, od której szukamy (mniej = za dużo szumu).

***

### TACHO\_MODES

> `const` **TACHO\_MODES**: readonly \[`"Młotki"`, `"Łóżko"`, `"Prom"`, `"Rozpoczęcie dnia"`, `"Zakończenie dnia"`\]

Defined in: [core/src/checklists.ts:30](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/checklists.ts#L30)

***

### TRAILER\_TYPES

> `const` **TRAILER\_TYPES**: readonly \[`"Plandeka"`, `"Chłodnia"`, `"Firana"`, `"Cysterna"`, `"Wywrotka"`, `"Kontenerowa"`, `"Niskopodwoziowa"`, `"Do przewozu aut"`, `"Silos"`, `"Inna"`\]

Defined in: [core/src/enums.ts:13](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/enums.ts#L13)

Typy naczep — podpowiedzi w formularzu pojazdu (#250; pole tekstowe, nie enum bazy).

***

### TRIP\_ACTIONS

> `const` **TRIP\_ACTIONS**: readonly \[`"load"`, `"unload"`, `"transshipment"`, `"start"`, `"end"`, `"service"`, `"other"`\]

Defined in: [core/src/enums.ts:31](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/enums.ts#L31)

Akcje formularza Trip — zgodne ze specyfikacją (DATA-MODEL §4).

***

### tripEventSchema

> `const` **tripEventSchema**: `ZodDiscriminatedUnion`\<\[`ZodObject`\<\{ `action`: `ZodLiteral`\<`"load"`\>; `comment`: `ZodOptional`\<`ZodString`\>; `odometerKm`: `ZodNumber`; `orderId`: `ZodOptional`\<`ZodString`\>; `place`: `ZodObject`\<\{ `city`: `ZodOptional`\<`ZodString`\>; `company`: `ZodOptional`\<`ZodString`\>; `country`: `ZodString`; `lat`: `ZodOptional`\<`ZodNumber`\>; `lng`: `ZodOptional`\<`ZodNumber`\>; `location`: `ZodOptional`\<`ZodString`\>; `postcode`: `ZodOptional`\<`ZodString`\>; \}, `$strip`\>; `vehicleId`: `ZodUUID`; `weightKg`: `ZodOptional`\<`ZodNumber`\>; \}, `$strip`\>, `ZodObject`\<\{ `action`: `ZodLiteral`\<`"unload"`\>; `comment`: `ZodOptional`\<`ZodString`\>; `odometerKm`: `ZodNumber`; `orderId`: `ZodOptional`\<`ZodString`\>; `place`: `ZodObject`\<\{ `city`: `ZodOptional`\<`ZodString`\>; `company`: `ZodOptional`\<`ZodString`\>; `country`: `ZodString`; `lat`: `ZodOptional`\<`ZodNumber`\>; `lng`: `ZodOptional`\<`ZodNumber`\>; `location`: `ZodOptional`\<`ZodString`\>; `postcode`: `ZodOptional`\<`ZodString`\>; \}, `$strip`\>; `vehicleId`: `ZodUUID`; `weightKg`: `ZodOptional`\<`ZodNumber`\>; \}, `$strip`\>, `ZodObject`\<\{ `action`: `ZodLiteral`\<`"transshipment"`\>; `comment`: `ZodOptional`\<`ZodString`\>; `fromVehicleReg`: `ZodString`; `odometerKm`: `ZodNumber`; `orderId`: `ZodOptional`\<`ZodString`\>; `place`: `ZodObject`\<\{ `city`: `ZodOptional`\<`ZodString`\>; `company`: `ZodOptional`\<`ZodString`\>; `country`: `ZodString`; `lat`: `ZodOptional`\<`ZodNumber`\>; `lng`: `ZodOptional`\<`ZodNumber`\>; `location`: `ZodOptional`\<`ZodString`\>; `postcode`: `ZodOptional`\<`ZodString`\>; \}, `$strip`\>; `toVehicleReg`: `ZodString`; `vehicleId`: `ZodUUID`; `weightKg`: `ZodOptional`\<`ZodNumber`\>; \}, `$strip`\>\], `"action"`\>

Defined in: [core/src/schemas.ts:201](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/schemas.ts#L201)

***

### VEHICLE\_COST\_CATEGORIES

> `const` **VEHICLE\_COST\_CATEGORIES**: readonly \[`"repair"`, `"leasing"`, `"insurance"`, `"tax"`, `"fine"`, `"parking"`, `"tires"`, `"other"`\]

Defined in: [core/src/vehicleCosts.ts:8](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/vehicleCosts.ts#L8)

***

### VEHICLE\_COST\_CATEGORY\_LABELS

> `const` **VEHICLE\_COST\_CATEGORY\_LABELS**: `Record`\<[`VehicleCostCategory`](../api/core/src.md#vehiclecostcategory), `string`\>

Defined in: [core/src/vehicleCosts.ts:20](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/vehicleCosts.ts#L20)

***

### VEHICLE\_MAKE\_GROUPS

> `const` **VEHICLE\_MAKE\_GROUPS**: readonly \[\{ `group`: `"Dostawcze / Furgonetki (do 3,5 t)"`; `makes`: readonly \[`"Renault"`, `"Ford"`, `"Fiat Professional"`, `"Mercedes-Benz"`, `"Volkswagen"`, `"Iveco"`, `"Toyota"`, `"Peugeot"`, `"Citroën"`, `"Opel"`, `"Maxus"`, `"Isuzu"`, `"Nissan"`, `"Kia"`, `"Hyundai"`\]; \}, \{ `group`: `"Ciężarowe (powyżej 3,5 t)"`; `makes`: readonly \[`"Scania"`, `"DAF"`, `"MAN"`, `"Volvo"`, `"Mercedes-Benz"`, `"Iveco"`, `"Renault Trucks"`, `"Ford Trucks"`\]; \}, \{ `group`: `"Pickupy"`; `makes`: readonly \[`"Toyota"`, `"Ford"`, `"Volkswagen"`, `"Isuzu"`, `"Mitsubishi"`, `"SsangYong"`\]; \}\]

Defined in: [core/src/catalog.ts:9](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/catalog.ts#L9)

***

### VEHICLE\_TYPES

> `const` **VEHICLE\_TYPES**: readonly \[`"truck"`, `"tractor"`, `"van"`, `"trailer"`, `"other"`\]

Defined in: [core/src/enums.ts:9](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/enums.ts#L9)

***

### vehicleCostSchema

> `const` **vehicleCostSchema**: `ZodObject`\<\{ `amount`: `ZodNumber`; `category`: `ZodEnum`\<\{ `fine`: `"fine"`; `insurance`: `"insurance"`; `leasing`: `"leasing"`; `other`: `"other"`; `parking`: `"parking"`; `repair`: `"repair"`; `tax`: `"tax"`; `tires`: `"tires"`; \}\>; `costDate`: `ZodString`; `currency`: `ZodDefault`\<`ZodString`\>; `description`: `ZodOptional`\<`ZodString`\>; `vehicleId`: `ZodUUID`; \}, `$strip`\>

Defined in: [core/src/schemas.ts:87](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/schemas.ts#L87)

***

### vehicleSchema

> `const` **vehicleSchema**: `ZodObject`\<\{ `adblueTankL`: `ZodOptional`\<`ZodNumber`\>; `comment`: `ZodOptional`\<`ZodString`\>; `curbWeightKg`: `ZodOptional`\<`ZodNumber`\>; `firstRegistrationDate`: `ZodOptional`\<`ZodString`\>; `forwarder`: `ZodOptional`\<`ZodString`\>; `fuelTankL`: `ZodOptional`\<`ZodNumber`\>; `heightCm`: `ZodOptional`\<`ZodNumber`\>; `inspectionExpiry`: `ZodOptional`\<`ZodString`\>; `insuranceExpiry`: `ZodOptional`\<`ZodString`\>; `insurer`: `ZodOptional`\<`ZodString`\>; `leasingEnd`: `ZodOptional`\<`ZodString`\>; `lengthCm`: `ZodOptional`\<`ZodNumber`\>; `licenseExpiry`: `ZodOptional`\<`ZodString`\>; `licenseNumber`: `ZodOptional`\<`ZodString`\>; `make`: `ZodOptional`\<`ZodString`\>; `maxPayloadKg`: `ZodOptional`\<`ZodNumber`\>; `model`: `ZodString`; `registration`: `ZodString`; `trailerRegistration`: `ZodOptional`\<`ZodString`\>; `trailerType`: `ZodOptional`\<`ZodString`\>; `vehicleType`: `ZodEnum`\<\{ `other`: `"other"`; `tractor`: `"tractor"`; `trailer`: `"trailer"`; `truck`: `"truck"`; `van`: `"van"`; \}\>; `vin`: `ZodOptional`\<`ZodString`\>; `widthCm`: `ZodOptional`\<`ZodNumber`\>; `year`: `ZodNumber`; \}, `$strip`\>

Defined in: [core/src/schemas.ts:34](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/schemas.ts#L34)

***

### WEEKLY\_REST\_LIMITS

> `const` **WEEKLY\_REST\_LIMITS**: `object`

Defined in: [core/src/weeklyRest.ts:35](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/weeklyRest.ts#L35)

#### Type Declaration

##### compensationWeeks

> `readonly` **compensationWeeks**: `3` = `3`

##### maxGapH

> `readonly` **maxGapH**: `144` = `144`

##### reducedH

> `readonly` **reducedH**: `24` = `24`

##### regularH

> `readonly` **regularH**: `45` = `45`

## Functions

### aetrStatus()

> **aetrStatus**(`raw`): [`AetrStatus`](../api/core/src.md#aetrstatus)

Defined in: [core/src/aetr.ts:72](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/aetr.ts#L72)

Wylicza stan licznika 561 (wartości w minutach). Ujemne wejścia → 0.

#### Parameters

##### raw

[`AetrInput`](../api/core/src.md#aetrinput)

#### Returns

[`AetrStatus`](../api/core/src.md#aetrstatus)

***

### aggregateConsumptionLPer100km()

> **aggregateConsumptionLPer100km**(`entries`): `number` \| `null`

Defined in: [core/src/billing.ts:108](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/billing.ts#L108)

Zagregowane spalanie [L/100km] dla serii tankowań.
Litry pierwszego wpisu są pomijane (to „pełny bak" startowy),
dystans liczony od pierwszego do ostatniego licznika.
Zwraca `null`, gdy danych jest za mało lub dystans = 0.

#### Parameters

##### entries

[`FuelEntry`](../api/core/src.md#fuelentry)[]

#### Returns

`number` \| `null`

***

### buildFleetInsights()

> **buildFleetInsights**(`input`): [`FleetInsights`](../api/core/src.md#fleetinsights)

Defined in: [core/src/insights.ts:126](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/insights.ts#L126)

Pełny zestaw insightów floty.

#### Parameters

##### input

###### fuelPricePerL

`number`

###### monthlyFuelCost

[`MonthlyPoint`](../api/core/src.md#monthlypoint)[]

###### vehicles

[`VehicleConsumption`](../api/core/src.md#vehicleconsumption)[]

#### Returns

[`FleetInsights`](../api/core/src.md#fleetinsights)

***

### buildFleetStatus()

> **buildFleetStatus**(`input`): [`FleetStatusRow`](../api/core/src.md#fleetstatusrow)[]

Defined in: [core/src/fleet.ts:74](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/fleet.ts#L74)

Buduje status każdego pojazdu:
- `driving` gdy ma zlecenie `in_progress` (pokazuje to zlecenie),
- `planned` gdy ma zlecenie `assigned` (pokazuje to zlecenie),
- `idle` w przeciwnym razie.
Dołącza ostatnie (najnowsze) zdarzenie trasy. Zlecenia/zdarzenia zakładane od najnowszego.
Wynik posortowany: jadące → zaplanowane → wolne, potem alfabetycznie po rejestracji.

#### Parameters

##### input

###### events

[`FleetStatusEventInput`](../api/core/src.md#fleetstatuseventinput)[]

###### orders

[`FleetStatusOrderInput`](../api/core/src.md#fleetstatusorderinput)[]

###### vehicles

`object`[]

#### Returns

[`FleetStatusRow`](../api/core/src.md#fleetstatusrow)[]

***

### buildJourneys()

> **buildJourneys**(`input`): [`Journey`](../api/core/src.md#journey)[]

Defined in: [core/src/journeys.ts:168](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/journeys.ts#L168)

Buduje listę wyjazdów ze zdarzeń trasy: dla każdego pojazdu segmentuje po
`start`…`end`. Zdarzenia między granicami (load/unload/service/other) oraz tankowania
w oknie czasowym wliczane są do wyjazdu. Wyjazd bez „end" jest `open`. Zdarzenia przed
pierwszym „start" są pomijane. Zwraca posortowane od najnowszego startu.

#### Parameters

##### input

[`BuildJourneysInput`](../api/core/src.md#buildjourneysinput)

#### Returns

[`Journey`](../api/core/src.md#journey)[]

***

### buildKsefFaXml()

> **buildKsefFaXml**(`inv`, `opts?`): `string`

Defined in: [core/src/ksef.ts:85](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/ksef.ts#L85)

Buduje XML faktury w strukturze FA(3). Agreguje netto/VAT per stawka
(P_13_x/P_14_x), sumę brutto w P_15 i pozycje w FaWiersz.

#### Parameters

##### inv

[`KsefInvoice`](../api/core/src.md#ksefinvoice)

##### opts?

###### generatedAt?

`Date`

###### systemInfo?

`string`

#### Returns

`string`

***

### buildPodCaption()

> **buildPodCaption**(`recipient`, `when`): `string`

Defined in: [core/src/pod.ts:46](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/pod.ts#L46)

Buduje `caption` podpisu z odbiorcy (opcjonalnie) i znacznika czasu.

#### Parameters

##### recipient

`string` \| `null` \| `undefined`

##### when

`string`

#### Returns

`string`

***

### buildSettlement()

> **buildSettlement**(`input`): [`Settlement`](../api/core/src.md#settlement)

Defined in: [core/src/billing.ts:224](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/billing.ts#L224)

Buduje rozliczenie okresu dla pojazdu: dystans z liczników tankowań,
koszt paliwa/AdBlue (sumy `priceTotal`), koszty serwis/inne ze zdarzeń trasy,
opcjonalne myto i przychód wg stawki za km → koszt całkowity i zysk.

#### Parameters

##### input

[`SettlementInput`](../api/core/src.md#settlementinput)

#### Returns

[`Settlement`](../api/core/src.md#settlement)

***

### clientProfitability()

> **clientProfitability**(`orders`, `vehicleCosts`): [`ClientProfitability`](../api/core/src.md#clientprofitability)

Defined in: [core/src/profitability.ts:54](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/profitability.ts#L54)

Rentowność per nadawca. **Model atrybucji (przybliżenie):** liczymy tylko
zrealizowany przychód EUR (zlecenia `delivered`/`invoiced`, waluta EUR). Koszt
paliwa każdego pojazdu rozdzielamy na jego zlecenia *proporcjonalnie do
przychodu*, po czym sumujemy per nadawca. Pomija: puste przebiegi, myto, pensje,
AdBlue, leasing oraz zlecenia w innych walutach. Koszt pojazdów bez przychodu
EUR trafia do `unattributedCostEur` (nie zniekształca marży klientów).

#### Parameters

##### orders

[`ProfitOrderEntry`](../api/core/src.md#profitorderentry)[]

##### vehicleCosts

[`VehicleCostEntry`](../api/core/src.md#vehiclecostentry)[]

#### Returns

[`ClientProfitability`](../api/core/src.md#clientprofitability)

***

### clientProfitTrend()

> **clientProfitTrend**(`client`, `orders`, `vehicleCosts`, `months`): [`ClientTrendPoint`](../api/core/src.md#clienttrendpoint)[]

Defined in: [core/src/profitability.ts:140](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/profitability.ts#L140)

Trend rentowności jednego nadawcy w czasie. Dla każdego miesiąca z `months`
uruchamia [clientProfitability] na danych z TEGO miesiąca (zlecenia i koszty
paliwa otagowane polem `month`) i wyciąga wiersz wskazanego klienta. Miesiące
bez aktywności klienta dają punkt zerowy — żeby seria nie miała dziur.

#### Parameters

##### client

`string`

##### orders

[`ProfitOrderEntry`](../api/core/src.md#profitorderentry) & `object`[]

##### vehicleCosts

[`VehicleCostEntry`](../api/core/src.md#vehiclecostentry) & `object`[]

##### months

`string`[]

#### Returns

[`ClientTrendPoint`](../api/core/src.md#clienttrendpoint)[]

***

### co2ByClient()

> **co2ByClient**(`orders`, `vehicleLiters`): [`ClientCo2`](../api/core/src.md#clientco2)[]

Defined in: [core/src/co2.ts:79](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/co2.ts#L79)

Emisje CO₂ przypisane do klientów (nadawców) — ten sam model atrybucji co
rentowność: litry paliwa pojazdu dzielone na jego zrealizowane zlecenia EUR
proporcjonalnie do przychodu, sumowane per nadawca → CO₂. Malejąco wg kg.

#### Parameters

##### orders

[`Co2OrderEntry`](../api/core/src.md#co2orderentry)[]

##### vehicleLiters

`object`[]

#### Returns

[`ClientCo2`](../api/core/src.md#clientco2)[]

***

### co2ByVehicle()

> **co2ByVehicle**(`vehicles`): [`VehicleCo2Row`](../api/core/src.md#vehicleco2row)[]

Defined in: [core/src/co2.ts:45](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/co2.ts#L45)

Emisje CO₂ per pojazd (malejąco wg kg). Pusta lista → pusto.

#### Parameters

##### vehicles

[`VehicleFuelInput`](../api/core/src.md#vehiclefuelinput)[]

#### Returns

[`VehicleCo2Row`](../api/core/src.md#vehicleco2row)[]

***

### co2PerHundredKm()

> **co2PerHundredKm**(`litersPer100km`): `number`

Defined in: [core/src/co2.ts:17](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/co2.ts#L17)

Intensywność emisji: kg CO₂ na 100 km przy danym spalaniu (L/100km).

#### Parameters

##### litersPer100km

`number`

#### Returns

`number`

***

### computeDriverGamification()

> **computeDriverGamification**(`input`): [`GamificationResult`](../api/core/src.md#gamificationresult)

Defined in: [core/src/gamification.ts:115](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/gamification.ts#L115)

Liczy pełny profil gamifikacji kierowcy.

#### Parameters

##### input

[`GamificationInput`](../api/core/src.md#gamificationinput)

#### Returns

[`GamificationResult`](../api/core/src.md#gamificationresult)

***

### computeDriverSettlement()

> **computeDriverSettlement**(`input`): [`DriverSettlementResult`](../api/core/src.md#driversettlementresult)

Defined in: [core/src/driverSettlement.ts:67](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/driverSettlement.ts#L67)

#### Parameters

##### input

[`DriverSettlementInput`](../api/core/src.md#driversettlementinput)

#### Returns

[`DriverSettlementResult`](../api/core/src.md#driversettlementresult)

***

### computePerDiem()

> **computePerDiem**(`trip`): [`DietResult`](../api/core/src.md#dietresult)

Defined in: [core/src/perDiem.ts:74](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/perDiem.ts#L74)

Liczy należną dietę za pojedynczą podróż. Ujemne godziny → zero.

#### Parameters

##### trip

[`DietTrip`](../api/core/src.md#diettrip)

#### Returns

[`DietResult`](../api/core/src.md#dietresult)

***

### computeTachoDays()

> **computeTachoDays**(`entries`): [`TachoSummary`](../api/core/src.md#tachosummary)

Defined in: [core/src/tachoTime.ts:59](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/tachoTime.ts#L59)

Buduje dni pracy i odpoczynki z wpisów checklisty Tachograf (dowolna kolejność).

#### Parameters

##### entries

[`TachoEntry`](../api/core/src.md#tachoentry)[]

#### Returns

[`TachoSummary`](../api/core/src.md#tachosummary)

***

### consumptionFullToFull()

> **consumptionFullToFull**(`entries`): `number` \| `null`

Defined in: [core/src/billing.ts:131](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/billing.ts#L131)

Spalanie metodą full-to-full: dystans liczony między pierwszym a ostatnim
pełnym bakiem, litry = suma wszystkich tankowań PO pierwszym pełnym do ostatniego
pełnego włącznie (uwzględnia tankowania częściowe pomiędzy). Najdokładniejsza metoda.
Zwraca `null`, gdy mniej niż 2 pełne baki lub dystans = 0.

#### Parameters

##### entries

[`FuelEntryFull`](../api/core/src.md#fuelentryfull)[]

#### Returns

`number` \| `null`

***

### consumptionLPer100km()

> **consumptionLPer100km**(`distanceKm`, `liters`): `number`

Defined in: [core/src/billing.ts:27](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/billing.ts#L27)

Spalanie [L/100km] dla pojedynczego odcinka.

#### Parameters

##### distanceKm

`number`

##### liters

`number`

#### Returns

`number`

***

### consumptionOutliers()

> **consumptionOutliers**(`vehicles`, `fuelPricePerL`, `thresholdPct?`): `object`

Defined in: [core/src/insights.ts:96](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/insights.ts#L96)

Pojazdy odstające spalaniem (> `thresholdPct`% powyżej mediany floty) wraz
z szacowanym dodatkowym kosztem: (spalanie − mediana)/100 × km × cena.

#### Parameters

##### vehicles

[`VehicleConsumption`](../api/core/src.md#vehicleconsumption)[]

##### fuelPricePerL

`number`

##### thresholdPct?

`number` = `10`

#### Returns

`object`

##### median

> **median**: `number`

##### outliers

> **outliers**: [`ConsumptionOutlier`](../api/core/src.md#consumptionoutlier)[]

***

### costRegister()

> **costRegister**(`entries`): [`CostRegister`](../api/core/src.md#costregister)

Defined in: [core/src/accounting.ts:93](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/accounting.ts#L93)

Rejestr kosztów: grupuje wpisy wg kategorii (malejąco wg kwoty) + suma.

#### Parameters

##### entries

[`CostEntry`](../api/core/src.md#costentry)[]

#### Returns

[`CostRegister`](../api/core/src.md#costregister)

***

### csvEscape()

> **csvEscape**(`value`, `sep?`): `string`

Defined in: [core/src/csv.ts:9](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/csv.ts#L9)

Escapuje pojedynczą komórkę: cudzysłów/separator/nowa linia → w cudzysłowach.

#### Parameters

##### value

[`CsvCell`](../api/core/src.md#csvcell)

##### sep?

`string` = `";"`

#### Returns

`string`

***

### dateToMonthInput()

> **dateToMonthInput**(`iso`): `string`

Defined in: [core/src/cardExpiry.ts:36](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/cardExpiry.ts#L36)

ISO "YYYY-MM-DD" → "YYYY-MM" (wartość dla `<input type="month">`).

#### Parameters

##### iso

`string` \| `null` \| `undefined`

#### Returns

`string`

***

### decodeActivityChange()

> **decodeActivityChange**(`word`): [`DddActivityChange`](../api/core/src.md#dddactivitychange)

Defined in: [core/src/ddd.ts:70](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/ddd.ts#L70)

Dekoduje 2-bajtowy ActivityChangeInfo: 'scpaat tttttttttt'.

#### Parameters

##### word

`number`

#### Returns

[`DddActivityChange`](../api/core/src.md#dddactivitychange)

***

### detectAmount()

> **detectAmount**(`text`): `number` \| `null`

Defined in: [core/src/receipt.ts:88](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/receipt.ts#L88)

Kwota „do zapłaty":
1) największa liczba w liniach ze słowem-kluczem sumy (SUMA/TOTAL/GESAMT…),
2) w braku — największa liczba groszowa w całym tekście (suma ≥ pozycji).

#### Parameters

##### text

`string`

#### Returns

`number` \| `null`

***

### detectCsvSeparator()

> **detectCsvSeparator**(`firstLine`): `";"` \| `","`

Defined in: [core/src/csvParse.ts:9](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/csvParse.ts#L9)

Zgaduje separator z pierwszej linii: częstszy z `;`/`,` (Excel PL domyślnie `;`).

#### Parameters

##### firstLine

`string`

#### Returns

`";"` \| `","`

***

### detectCurrency()

> **detectCurrency**(`text`): `string` \| `null`

Defined in: [core/src/receipt.ts:74](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/receipt.ts#L74)

Waluta z całego tekstu — pierwszy rozpoznany token (poza numerami NIP itd.).

#### Parameters

##### text

`string`

#### Returns

`string` \| `null`

***

### detectFuelAnomalies()

> **detectFuelAnomalies**(`segments`, `opts?`): [`FuelAnomaly`](../api/core/src.md#fuelanomaly)[]

Defined in: [core/src/billing.ts:72](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/billing.ts#L72)

Wykrywa odcinki o spalaniu istotnie wyższym od mediany pojazdu — możliwy
wyciek/kradzież paliwa lub usterka. Mediana jest odporna na pojedyncze outliery.
Wymaga ≥ `minSegments` odcinków; `thresholdPct` = ile % ponad medianę (domyślnie 20).

#### Parameters

##### segments

[`ConsumptionSegment`](../api/core/src.md#consumptionsegment)[]

##### opts?

###### minSegments?

`number`

###### thresholdPct?

`number`

#### Returns

[`FuelAnomaly`](../api/core/src.md#fuelanomaly)[]

***

### detectLiters()

> **detectLiters**(`text`): `number` \| `null`

Defined in: [core/src/receipt.ts:108](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/receipt.ts#L108)

#### Parameters

##### text

`string`

#### Returns

`number` \| `null`

***

### dieselCo2Kg()

> **dieselCo2Kg**(`liters`): `number`

Defined in: [core/src/co2.ts:12](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/co2.ts#L12)

CO₂ (kg) z podanej liczby litrów oleju napędowego.

#### Parameters

##### liters

`number`

#### Returns

`number`

***

### effectiveFuelPrice()

> **effectiveFuelPrice**(`pricePerLiter`, `discountPercent?`): `number`

Defined in: [core/src/billing.ts:154](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/billing.ts#L154)

Cena za litr po uwzględnieniu rabatu karty paliwowej (0–100%).

#### Parameters

##### pricePerLiter

`number`

##### discountPercent?

`number` = `0`

#### Returns

`number`

***

### effectiveModules()

> **effectiveModules**(`role`, `modules`): (`"vehicles"` \| `"drivers"` \| `"cards"` \| `"forms"` \| `"reports"` \| `"map"` \| `"stats"` \| `"settlements"` \| `"orders"` \| `"checklists"` \| `"documents"` \| `"damages"`)[]

Defined in: [core/src/catalog.ts:92](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/catalog.ts#L92)

Efektywne moduły: własne (jeśli ustawione) lub domyślne dla roli.

#### Parameters

##### role

`string`

##### modules

`string`[] \| `null` \| `undefined`

#### Returns

(`"vehicles"` \| `"drivers"` \| `"cards"` \| `"forms"` \| `"reports"` \| `"map"` \| `"stats"` \| `"settlements"` \| `"orders"` \| `"checklists"` \| `"documents"` \| `"damages"`)[]

***

### effectivePermission()

> **effectivePermission**(`role`, `modules`, `permissions`, `module`): `"none"` \| `"view"` \| `"edit"`

Defined in: [core/src/catalog.ts:390](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/catalog.ts#L390)

Efektywny poziom uprawnień członka do modułu.

#### Parameters

##### role

`string`

##### modules

`string`[] \| `null` \| `undefined`

##### permissions

`Partial`\<`Record`\<`"vehicles"` \| `"drivers"` \| `"cards"` \| `"forms"` \| `"reports"` \| `"map"` \| `"stats"` \| `"settlements"` \| `"orders"` \| `"checklists"` \| `"documents"` \| `"damages"`, `"none"` \| `"view"` \| `"edit"`\>\> \| `null` \| `undefined`

##### module

`"vehicles"` \| `"drivers"` \| `"cards"` \| `"forms"` \| `"reports"` \| `"map"` \| `"stats"` \| `"settlements"` \| `"orders"` \| `"checklists"` \| `"documents"` \| `"damages"`

#### Returns

`"none"` \| `"view"` \| `"edit"`

***

### estimateRouteFuel()

> **estimateRouteFuel**(`input`): [`RouteFuelEstimate`](../api/core/src.md#routefuelestimate)

Defined in: [core/src/ecoRoute.ts:31](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/ecoRoute.ts#L31)

Szacuje paliwo, koszt i CO₂ dla jednej trasy.

#### Parameters

##### input

[`RouteFuelInput`](../api/core/src.md#routefuelinput)

#### Returns

[`RouteFuelEstimate`](../api/core/src.md#routefuelestimate)

***

### expiryStatus()

> **expiryStatus**(`dateISO`, `todayISO`, `warnDays?`): [`ExpiryStatus`](../api/core/src.md#expirystatus)

Defined in: [core/src/expiry.ts:14](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/expiry.ts#L14)

Liczy status ważności na podstawie daty (YYYY-MM-DD) względem „dziś".
`level`: expired (po terminie), soon (≤ warnDays), ok.

#### Parameters

##### dateISO

`string`

##### todayISO

`string`

##### warnDays?

`number` = `30`

#### Returns

[`ExpiryStatus`](../api/core/src.md#expirystatus)

***

### filterSortOrders()

> **filterSortOrders**\<`T`\>(`orders`, `q?`): `T`[]

Defined in: [core/src/orderFilter.ts:43](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/orderFilter.ts#L43)

Filtruje (tekst + status) i sortuje zlecenia. Zwraca nową tablicę.

#### Type Parameters

##### T

`T` *extends* [`OrderFilterItem`](../api/core/src.md#orderfilteritem)

#### Parameters

##### orders

`T`[]

##### q?

[`OrderQuery`](../api/core/src.md#orderquery) = `{}`

#### Returns

`T`[]

***

### firstZodError()

> **firstZodError**(`error`, `fallback?`): `string`

Defined in: [core/src/zodErrors.ts:14](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/zodErrors.ts#L14)

Pierwszy komunikat błędu walidacji (proste UI, np. mobile).

#### Parameters

##### error

`ZodError`

##### fallback?

`string` = `"Błąd walidacji"`

#### Returns

`string`

***

### fleetAlerts()

> **fleetAlerts**(`input`): [`FleetAlert`](../api/core/src.md#fleetalert)[]

Defined in: [core/src/alerts.ts:38](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/alerts.ts#L38)

Lista alertów posortowana: najpierw krytyczne (ujemna marża), potem ostrzeżenia
wg wielkości (więcej anomalii / większy skok wyżej). Progi konfigurowalne.

#### Parameters

##### input

[`FleetAlertInput`](../api/core/src.md#fleetalertinput)

#### Returns

[`FleetAlert`](../api/core/src.md#fleetalert)[]

***

### fleetPnl()

> **fleetPnl**(`revenueEur`, `fuelEur`, `otherCostEur`): [`FleetPnl`](../api/core/src.md#fleetpnl)

Defined in: [core/src/vehicleCosts.ts:81](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/vehicleCosts.ts#L81)

Rachunek zysków i strat floty: przychód − paliwo − pozostałe koszty.

#### Parameters

##### revenueEur

`number`

##### fuelEur

`number`

##### otherCostEur

`number`

#### Returns

[`FleetPnl`](../api/core/src.md#fleetpnl)

***

### fleetPnlByVehicle()

> **fleetPnlByVehicle**(`orders`, `fuelByVehicle`, `costsByVehicle`): [`VehiclePnlRow`](../api/core/src.md#vehiclepnlrow)[]

Defined in: [core/src/vehiclePnl.ts:65](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/vehiclePnl.ts#L65)

Ranking P&L per pojazd: przychód EUR (zlecenia zrealizowane) − paliwo −
pozostałe koszty, dla każdego pojazdu osobno. Malejąco wg zysku. Obejmuje
pojazdy mające jakikolwiek przychód, paliwo lub koszt.

#### Parameters

##### orders

[`FleetPnlOrder`](../api/core/src.md#fleetpnlorder)[]

##### fuelByVehicle

[`VehicleAmountEur`](../api/core/src.md#vehicleamounteur)[]

##### costsByVehicle

[`VehicleAmountEur`](../api/core/src.md#vehicleamounteur)[]

#### Returns

[`VehiclePnlRow`](../api/core/src.md#vehiclepnlrow)[]

***

### formatCardExpiry()

> **formatCardExpiry**(`iso`): `string`

Defined in: [core/src/cardExpiry.ts:43](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/cardExpiry.ts#L43)

ISO "YYYY-MM-DD" → wyświetlane "MM/YYYY" (jak na karcie). Pusto → "—".

#### Parameters

##### iso

`string` \| `null` \| `undefined`

#### Returns

`string`

***

### formatCo2()

> **formatCo2**(`kg`): `string`

Defined in: [core/src/co2.ts:22](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/co2.ts#L22)

Czytelny zapis emisji: kg poniżej tony, powyżej w tonach.

#### Parameters

##### kg

`number`

#### Returns

`string`

***

### formatDuration()

> **formatDuration**(`minutes`): `string`

Defined in: [core/src/duration.ts:2](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/duration.ts#L2)

Czytelne formatowanie czasu trwania (minuty → „X d Y h Z min"). Funkcja czysta.

#### Parameters

##### minutes

`number`

#### Returns

`string`

***

### formatMinutes()

> **formatMinutes**(`min`): `string`

Defined in: [core/src/tachoTime.ts:147](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/tachoTime.ts#L147)

„8 h 30 min" z minut.

#### Parameters

##### min

`number`

#### Returns

`string`

***

### formatMoney()

> **formatMoney**(`value`, `currency?`): `string`

Defined in: [core/src/money.ts:18](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/money.ts#L18)

Formatuje kwotę po polsku: 2 miejsca po przecinku, spacja jako separator
tysięcy, przecinek dziesiętny (np. `1 234,50`). Z `currency` dokleja walutę
(np. `1 234,50 EUR`). Deterministyczne — do dokumentów (faktura/CMR).

#### Parameters

##### value

`number`

##### currency?

`string`

#### Returns

`string`

***

### formatTachoMin()

> **formatTachoMin**(`min`): `string`

Defined in: [core/src/aetr.ts:130](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/aetr.ts#L130)

„7h05" — format liczników jak na wyświetlaczu tacho.

#### Parameters

##### min

`number`

#### Returns

`string`

***

### freightExportRows()

> **freightExportRows**(`orders`): [`FreightRow`](../api/core/src.md#freightrow)[]

Defined in: [core/src/freightExport.ts:87](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/freightExport.ts#L87)

Mapuje listę zleceń; pomija pozycje bez trasy (brak załadunku i rozładunku).

#### Parameters

##### orders

[`FreightOrderInput`](../api/core/src.md#freightorderinput)[]

#### Returns

[`FreightRow`](../api/core/src.md#freightrow)[]

***

### freightRowCells()

> **freightRowCells**(`r`): (`string` \| `number`)[]

Defined in: [core/src/freightExport.ts:71](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/freightExport.ts#L71)

Wartości wiersza w kolejności `FREIGHT_EXPORT_HEADERS` (do CSV).

#### Parameters

##### r

[`FreightRow`](../api/core/src.md#freightrow)

#### Returns

(`string` \| `number`)[]

***

### fuelByMonth()

> **fuelByMonth**(`entries`, `months`): [`FuelMonthPoint`](../api/core/src.md#fuelmonthpoint)[]

Defined in: [core/src/fuelTrend.ts:22](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/fuelTrend.ts#L22)

Sumuje litry i wydatek per miesiąc dla podanej listy miesięcy (`YYYY-MM`).

#### Parameters

##### entries

[`FuelMonthInput`](../api/core/src.md#fuelmonthinput)[]

##### months

`string`[]

#### Returns

[`FuelMonthPoint`](../api/core/src.md#fuelmonthpoint)[]

***

### fuelConsumptionSeries()

> **fuelConsumptionSeries**(`entries`): [`ConsumptionSegment`](../api/core/src.md#consumptionsegment)[]

Defined in: [core/src/billing.ts:38](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/billing.ts#L38)

Spalanie metodą „tank-to-tank": dla każdego kolejnego tankowania litry
z bieżącego wpisu pokrywają dystans od poprzedniego stanu licznika.
Wpisy są sortowane rosnąco po `odometerKm`.

#### Parameters

##### entries

[`FuelEntry`](../api/core/src.md#fuelentry)[]

#### Returns

[`ConsumptionSegment`](../api/core/src.md#consumptionsegment)[]

***

### fuelCost()

> **fuelCost**(`liters`, `pricePerLiter`, `discountPercent?`): `number`

Defined in: [core/src/billing.ts:162](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/billing.ts#L162)

Koszt tankowania = litry × cena efektywna (po rabacie).

#### Parameters

##### liters

`number`

##### pricePerLiter

`number`

##### discountPercent?

`number` = `0`

#### Returns

`number`

***

### fuelCostPerKmByVehicle()

> **fuelCostPerKmByVehicle**(`fuel`, `adblue?`): `Record`\<`string`, `number`\>

Defined in: [core/src/orderCost.ts:80](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/orderCost.ts#L80)

Koszt paliwa (+AdBlue) na km per pojazd z historii tankowań:
(Σ priceTotal paliwa + Σ priceTotal AdBlue) / (max−min licznik z tankowań paliwa).
Zwraca `null` dla pojazdu, gdy < 2 tankowań paliwa lub dystans = 0.

#### Parameters

##### fuel

[`OrderCostFuelEntry`](../api/core/src.md#ordercostfuelentry)[]

##### adblue?

[`OrderCostFuelEntry`](../api/core/src.md#ordercostfuelentry)[] = `[]`

#### Returns

`Record`\<`string`, `number`\>

***

### guessDefectPart()

> **guessDefectPart**(`description`): `string` \| `null`

Defined in: [core/src/catalog.ts:206](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/catalog.ts#L206)

Zgaduje układ na podstawie opisu (pierwsze trafienie) — do auto-podświetlenia.

#### Parameters

##### description

`string`

#### Returns

`string` \| `null`

***

### invoicePaymentStatus()

> **invoicePaymentStatus**(`input`): [`PaymentStatus`](../api/core/src.md#paymentstatus)

Defined in: [core/src/invoice.ts:12](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/invoice.ts#L12)

Status płatności na podstawie daty opłacenia, terminu i statusu faktury.
- `paid` gdy ustawiono `paidAt`,
- `overdue` gdy nieopłacona, wystawiona (nie anulowana) i po terminie (`dueDate < dziś`),
- `unpaid` w pozostałych przypadkach (w tym anulowana — nie liczona jako przeterminowana).

#### Parameters

##### input

###### dueDate

`string` \| `null`

###### paidAt

`string` \| `null`

###### status

`string`

###### todayISO

`string`

#### Returns

[`PaymentStatus`](../api/core/src.md#paymentstatus)

***

### isPodCaption()

> **isPodCaption**(`caption`): `boolean`

Defined in: [core/src/pod.ts:13](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/pod.ts#L13)

Czy `caption` oznacza podpis odbiorcy (POD), a nie zwykłe zdjęcie towaru.

#### Parameters

##### caption

`string` \| `null` \| `undefined`

#### Returns

`boolean`

***

### latestUnitPrice()

> **latestUnitPrice**(`entries`): `number` \| `null`

Defined in: [core/src/billing.ts:269](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/billing.ts#L269)

Ostatnia cena jednostkowa [waluta/L] z historii tankowań (do podpowiedzi w formularzu).
Wpisy zakładane jako od najnowszego; bierze pierwszy z dodatnią kwotą i litrami.
Zwraca `null`, gdy brak danych do wyliczenia.

#### Parameters

##### entries

`object`[]

#### Returns

`number` \| `null`

***

### linearTrend()

> **linearTrend**(`series`): [`TrendResult`](../api/core/src.md#trendresult) \| `null`

Defined in: [core/src/insights.ts:63](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/insights.ts#L63)

Regresja liniowa metodą najmniejszych kwadratów; x = indeks miesiąca (0..n-1).

#### Parameters

##### series

[`MonthlyPoint`](../api/core/src.md#monthlypoint)[]

#### Returns

[`TrendResult`](../api/core/src.md#trendresult) \| `null`

***

### monthInputToDate()

> **monthInputToDate**(`value`): `string` \| `null`

Defined in: [core/src/cardExpiry.ts:13](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/cardExpiry.ts#L13)

"YYYY-MM" (z `<input type="month">`) **lub** "MM/YYYY" / "MM.YYYY" (wpis ręczny,
np. Safari renderuje type="month" jako zwykły tekst — #316) → ISO ostatniego
dnia miesiąca "YYYY-MM-DD".

#### Parameters

##### value

`string`

#### Returns

`string` \| `null`

***

### monthlyFleetSummary()

> **monthlyFleetSummary**(`input`): [`MonthlyFleetSummary`](../api/core/src.md#monthlyfleetsummary)

Defined in: [core/src/billing.ts:319](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/billing.ts#L319)

Miesięczne zestawienie floty: przychód ze zleceń (status `delivered`/`invoiced`,
waluta EUR) zestawiony z kosztami paliwa i AdBlue — per pojazd. Atrybucja po
miesiącu `YYYY-MM` (prefiks daty). Pozycje bez pojazdu trafiają do wiersza `null`.
Inne waluty zleceń są świadomie pomijane w sumie EUR (bez kursów). Funkcja czysta.

#### Parameters

##### input

###### adblue

[`MonthlyCostEntry`](../api/core/src.md#monthlycostentry)[]

###### fuel

[`MonthlyCostEntry`](../api/core/src.md#monthlycostentry)[]

###### month

`string`

###### orders

[`MonthlyOrderEntry`](../api/core/src.md#monthlyorderentry)[]

#### Returns

[`MonthlyFleetSummary`](../api/core/src.md#monthlyfleetsummary)

***

### monthlyFleetTrend()

> **monthlyFleetTrend**(`input`): [`MonthlyTrendPoint`](../api/core/src.md#monthlytrendpoint)[]

Defined in: [core/src/billing.ts:398](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/billing.ts#L398)

Trend floty: sumy (przychód/koszty/wynik) dla każdego z podanych miesięcy.

#### Parameters

##### input

###### adblue

[`MonthlyCostEntry`](../api/core/src.md#monthlycostentry)[]

###### fuel

[`MonthlyCostEntry`](../api/core/src.md#monthlycostentry)[]

###### months

`string`[]

###### orders

[`MonthlyOrderEntry`](../api/core/src.md#monthlyorderentry)[]

#### Returns

[`MonthlyTrendPoint`](../api/core/src.md#monthlytrendpoint)[]

***

### monthlyVatRegister()

> **monthlyVatRegister**(`invoices`, `month`): [`VatRegister`](../api/core/src.md#vatregister)

Defined in: [core/src/accounting.ts:37](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/accounting.ts#L37)

Rejestr VAT za miesiąc `YYYY-MM`: tylko faktury wystawione (status ≠ cancelled)
z `issue_date` w danym miesiącu, pogrupowane wg stawki VAT (malejąco).

#### Parameters

##### invoices

[`VatRegisterInvoice`](../api/core/src.md#vatregisterinvoice)[]

##### month

`string`

#### Returns

[`VatRegister`](../api/core/src.md#vatregister)

***

### monthsEndingAt()

> **monthsEndingAt**(`anchor`, `count`): `string`[]

Defined in: [core/src/billing.ts:383](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/billing.ts#L383)

Lista `count` miesięcy „YYYY-MM" kończąca się na `anchor` (włącznie), od najstarszego.

#### Parameters

##### anchor

`string`

##### count

`number`

#### Returns

`string`[]

***

### newId()

> **newId**(): `string`

Defined in: [core/src/ids.ts:10](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/ids.ts#L10)

Generuje identyfikator rekordu tworzonego na kliencie (offline-first).
Preferuje Web Crypto `randomUUID` (Node 26, przeglądarki), ale MUSI działać
także w Hermes/React Native, gdzie Web Crypto nie istnieje — #355: wcześniej
rzucaliśmy tu wyjątek, przez co KAŻDY zapis formularza w aplikacji mobilnej
(outbox `enqueue`) padał po cichu („przycisk nic nie robi"). Fallback:
`getRandomValues` → `Math.random`, zawsze w formacie UUIDv4 (RFC 4122).
Dostęp przez `globalThis`, by `packages/core` pozostał niezależny od DOM/Node.

#### Returns

`string`

***

### normalizeNip()

> **normalizeNip**(`taxId`): `string` \| `null`

Defined in: [core/src/ksef.ts:52](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/ksef.ts#L52)

Wyłuskuje 10-cyfrowy NIP (usuwa PL, kreski, spacje); null gdy niepoprawny.

#### Parameters

##### taxId

`string` \| `null` \| `undefined`

#### Returns

`string` \| `null`

***

### orderAnalytics()

> **orderAnalytics**(`orders`, `topN?`): [`OrderAnalytics`](../api/core/src.md#orderanalytics)

Defined in: [core/src/orders.ts:35](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/orders.ts#L35)

Analiza zleceń (pomija anulowane): top nadawcy wg przychodu EUR, najczęstsze
trasy wg liczby, średnia stawka EUR. `topN` ogranicza listy.

#### Parameters

##### orders

[`OrderAnalyticsEntry`](../api/core/src.md#orderanalyticsentry)[]

##### topN?

`number` = `5`

#### Returns

[`OrderAnalytics`](../api/core/src.md#orderanalytics)

***

### orderTransportCosts()

> **orderTransportCosts**(`input`): [`OrderTransportCost`](../api/core/src.md#ordertransportcost)[]

Defined in: [core/src/orderCost.ts:119](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/orderCost.ts#L119)

Liczy koszt transportu dla każdego zlecenia, które ma powiązane zdarzenia trasy.
Zlecenia bez `order_id` w zdarzeniach są pomijane (brak danych). Zwraca posortowane
malejąco po dacie rozładunku (najświeższe pierwsze).

#### Parameters

##### input

[`OrderTransportCostInput`](../api/core/src.md#ordertransportcostinput)

#### Returns

[`OrderTransportCost`](../api/core/src.md#ordertransportcost)[]

***

### parseCsv()

> **parseCsv**(`input`, `sep?`): `string`[][]

Defined in: [core/src/csvParse.ts:25](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/csvParse.ts#L25)

Parsuje dokument CSV do tablicy wierszy (każdy wiersz = tablica komórek-stringów).
Puste linie są pomijane. Pierwszy wiersz zwykle to nagłówki (decyzja wołającego).

#### Parameters

##### input

`string`

##### sep?

`";"` \| `","`

#### Returns

`string`[][]

***

### parseDddDriverCard()

> **parseDddDriverCard**(`bytes`): [`DddParseResult`](../api/core/src.md#dddparseresult)

Defined in: [core/src/ddd.ts:166](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/ddd.ts#L166)

Parsuje cały plik .ddd karty kierowcy (Gen1 + Gen2).

#### Parameters

##### bytes

`Uint8Array`

#### Returns

[`DddParseResult`](../api/core/src.md#dddparseresult)

***

### parsePodCaption()

> **parsePodCaption**(`caption`): [`PodInfo`](../api/core/src.md#podinfo)

Defined in: [core/src/pod.ts:31](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/pod.ts#L31)

Rozkłada `caption` podpisu na odbiorcę i datę. Dla nie-POD lub pustego —
zwraca {recipient:null, when:null}. Datę bierze z ostatniego separatora,
więc odbiorca może zawierać kropki/spacje.

#### Parameters

##### caption

`string` \| `null` \| `undefined`

#### Returns

[`PodInfo`](../api/core/src.md#podinfo)

***

### parseReceiptText()

> **parseReceiptText**(`text`): [`ReceiptParse`](../api/core/src.md#receiptparse)

Defined in: [core/src/receipt.ts:123](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/receipt.ts#L123)

Pełny parse tekstu z OCR paragonu.

#### Parameters

##### text

`string`

#### Returns

[`ReceiptParse`](../api/core/src.md#receiptparse)

***

### parseTachoTimes()

> **parseTachoTimes**(`text`): `number`[]

Defined in: [core/src/weeklyRest.ts:66](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/weeklyRest.ts#L66)

#330: Parser liczników z OCR zdjęcia wyświetlacza tacho — wyłuskuje
wartości „XXhYY" (np. 04h30, 129h1 → 129h10 traktujemy ostrożnie: tylko
pełne 2 cyfry minut). Zwraca minuty, bez duplikatów, w kolejności tekstu.

#### Parameters

##### text

`string`

#### Returns

`number`[]

***

### photoCategoryCaption()

> **photoCategoryCaption**(`category`): `string` \| `undefined`

Defined in: [core/src/photoCategories.ts:14](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/photoCategories.ts#L14)

Caption do zapisania dla wybranej kategorii (domyślna „Towar" → brak captiona).

#### Parameters

##### category

`string`

#### Returns

`string` \| `undefined`

***

### pickEcoRoute()

> **pickEcoRoute**(`candidates`, `fuel`): [`EcoPick`](../api/core/src.md#ecopick) \| `null`

Defined in: [core/src/ecoRoute.ts:73](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/ecoRoute.ts#L73)

Wybiera wariant najtańszy (paliwo + myto). Zwraca też porównanie z trasą
najszybszą (najkrótszy czas), by pokazać kompromis „taniej, ale wolniej".

#### Parameters

##### candidates

[`RouteCandidate`](../api/core/src.md#routecandidate)[]

##### fuel

###### avgConsumptionL100?

`number`

###### fuelPricePerL

`number`

#### Returns

[`EcoPick`](../api/core/src.md#ecopick) \| `null`

***

### pickRate()

> **pickRate**\<`T`\>(`rates`, `vehicleId`): `number` \| `null`

Defined in: [core/src/rates.ts:26](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/rates.ts#L26)

Stawka €/km dla pojazdu: stawka pojazdu → domyślna firmowa → `null`.

#### Type Parameters

##### T

`T` *extends* [`RateLike`](../api/core/src.md#ratelike)

#### Parameters

##### rates

readonly `T`[]

lista stawek firmy (dowolna kolejność)

##### vehicleId

`string`

pojazd, dla którego liczymy rozliczenie

#### Returns

`number` \| `null`

***

### planWeeklyRest()

> **planWeeklyRest**(`input`, `nowMs`): [`WeeklyRestPlan`](../api/core/src.md#weeklyrestplan)

Defined in: [core/src/weeklyRest.ts:43](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/weeklyRest.ts#L43)

Plan kolejnego odpoczynku tygodniowego względem `nowMs`.

#### Parameters

##### input

[`WeeklyRestPlanInput`](../api/core/src.md#weeklyrestplaninput)

##### nowMs

`number`

#### Returns

[`WeeklyRestPlan`](../api/core/src.md#weeklyrestplan)

***

### resolvePhotoKind()

> **resolvePhotoKind**(`photo`): `"other"` \| `"cargo"` \| `"cmr"` \| `"document"` \| `"pod"`

Defined in: [core/src/photoCategories.ts:39](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/photoCategories.ts#L39)

Wyprowadza typ zdjęcia: preferuje kolumnę `kind` (po migracji 0054), a gdy jej brak
(przed migracją / stary wiersz) — fallback z `caption`. Ta sama logika co generowana
kolumna w SQL, więc filtrowanie działa spójnie także client-side przed migracją.

#### Parameters

##### photo

###### caption?

`string` \| `null`

###### kind?

`string` \| `null`

#### Returns

`"other"` \| `"cargo"` \| `"cmr"` \| `"document"` \| `"pod"`

***

### round2()

> **round2**(`n`): `number`

Defined in: [core/src/money.ts:9](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/money.ts#L9)

Pomocnik zaokrąglania kwot do 2 miejsc po przecinku.

UWAGA (do produkcji): operujemy na `number` (IEEE-754) — dla rozliczeń
o wysokiej stawce rozważyć przejście na liczby całkowite (grosze)
lub bibliotekę decimal. Na obecnym etapie `round2` jest świadomym,
udokumentowanym kompromisem i jest punktem zaczepienia do zmiany.

#### Parameters

##### n

`number`

#### Returns

`number`

***

### routeDelta()

> **routeDelta**(`before`, `after`): [`RouteDelta`](../api/core/src.md#routedelta)

Defined in: [core/src/savedPlaces.ts:44](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/savedPlaces.ts#L44)

Różnica „po − przed" dla trasy: dystans (km), czas (min), myto (€).

#### Parameters

##### before

[`RouteTotals`](../api/core/src.md#routetotals)

##### after

[`RouteTotals`](../api/core/src.md#routetotals)

#### Returns

[`RouteDelta`](../api/core/src.md#routedelta)

***

### searchEntities()

> **searchEntities**\<`T`\>(`query`, `items`, `limit?`): `T`[]

Defined in: [core/src/search.ts:26](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/search.ts#L26)

Dopasowuje pozycje do frazy (wszystkie tokeny muszą wystąpić) i sortuje wg
trafności: tytuł zaczyna się od frazy → zawiera frazę → reszta. Zwraca top N.

#### Type Parameters

##### T

`T` *extends* [`SearchItem`](../api/core/src.md#searchitem)

#### Parameters

##### query

`string`

##### items

`T`[]

##### limit?

`number` = `8`

#### Returns

`T`[]

***

### serviceStatus()

> **serviceStatus**(`currentKm`, `lastDoneKm`, `intervalKm`, `warnKm?`): [`ServiceStatus`](../api/core/src.md#servicestatus)

Defined in: [core/src/expiry.ts:34](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/expiry.ts#L34)

Status serwisu wg przebiegu: cel = ostatni serwis + interwał.
`level`: expired (po przebiegu), soon (≤ warnKm), ok. Brak danych → ok/null.

#### Parameters

##### currentKm

`number` \| `null`

##### lastDoneKm

`number` \| `null`

##### intervalKm

`number` \| `null`

##### warnKm?

`number` = `2000`

#### Returns

[`ServiceStatus`](../api/core/src.md#servicestatus)

***

### settleDriverPayouts()

> **settleDriverPayouts**(`entries`): [`PayoutBalance`](../api/core/src.md#payoutbalance)[]

Defined in: [core/src/payouts.ts:38](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/payouts.ts#L38)

Rozlicza pozycje kierowcy per waluta (malejąco wg salda). Ujemne kwoty → 0.

#### Parameters

##### entries

[`PayoutEntry`](../api/core/src.md#payoutentry)[]

#### Returns

[`PayoutBalance`](../api/core/src.md#payoutbalance)[]

***

### setupMessage()

> **setupMessage**(`source`, `opts?`): `string` \| `null`

Defined in: [core/src/setup.ts:9](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/setup.ts#L9)

Komunikat onboardingu dla widoków zależnych od floty. `source` pochodzi z
`useFleet`/membership ("ok" | "demo" | "no-company" | "no-vehicles" | …).

Czysta funkcja — używana przez komponent `SetupNotice` (render) ORAZ przez
strony, które potrzebują wartości do logiki (np. blokada przycisku „Zapisz").
Wcześniej ta sama kaskada warunków była kopiowana inline w kilku miejscach.

#### Parameters

##### source

`string`

##### opts?

###### noCompany?

`string`

###### noVehicles?

`string`

#### Returns

`string` \| `null`

***

### stationBrandsForProviders()

> **stationBrandsForProviders**(`providers`): `string`[]

Defined in: [core/src/catalog.ts:344](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/catalog.ts#L344)

Zbiór słów-kluczy marek dla wskazanych kart (poglądowo).

#### Parameters

##### providers

(`"dkv"` \| `"eurowag"` \| `"shell"` \| `"bp"` \| `"circlek"` \| `"e100"` \| `"uta"` \| `"as24"` \| `"aral"` \| `"omv"` \| `"routex"` \| `"logpay"` \| `"esso"` \| `"totalenergies"` \| `"tankpool24"` \| `"morganfuels"` \| `"iqcard"` \| `"other"`)[]

#### Returns

`string`[]

***

### stationMatchesProviders()

> **stationMatchesProviders**(`haystack`, `providers`): `boolean`

Defined in: [core/src/catalog.ts:353](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/catalog.ts#L353)

Czy stacja (tekst z tagów OSM: marka/operator/nazwa) pasuje do którejś
z kart? `haystack` powinien być złączeniem brand/operator/name (lowercase).
Pusty zestaw kart → brak filtra (zwraca `true`).

#### Parameters

##### haystack

`string`

##### providers

(`"dkv"` \| `"eurowag"` \| `"shell"` \| `"bp"` \| `"circlek"` \| `"e100"` \| `"uta"` \| `"as24"` \| `"aral"` \| `"omv"` \| `"routex"` \| `"logpay"` \| `"esso"` \| `"totalenergies"` \| `"tankpool24"` \| `"morganfuels"` \| `"iqcard"` \| `"other"`)[]

#### Returns

`boolean`

***

### sumCostsByCategory()

> **sumCostsByCategory**(`costs`): [`CostCategoryTotal`](../api/core/src.md#costcategorytotal)[]

Defined in: [core/src/vehicleCosts.ts:45](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/vehicleCosts.ts#L45)

Suma kosztów wg kategorii (malejąco). Nieznane kategorie → „other".

#### Parameters

##### costs

[`VehicleCostRecord`](../api/core/src.md#vehiclecostrecord)[]

#### Returns

[`CostCategoryTotal`](../api/core/src.md#costcategorytotal)[]

***

### sumCostsByVehicle()

> **sumCostsByVehicle**(`costs`): `object`[]

Defined in: [core/src/vehicleCosts.ts:63](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/vehicleCosts.ts#L63)

Suma kosztów (EUR) per pojazd — wejście do atrybucji rentowności.

#### Parameters

##### costs

[`VehicleCostRecord`](../api/core/src.md#vehiclecostrecord)[]

#### Returns

`object`[]

***

### summarizeDamageClaims()

> **summarizeDamageClaims**(`claims`): [`DamageSummary`](../api/core/src.md#damagesummary)

Defined in: [core/src/damageClaims.ts:61](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/damageClaims.ts#L61)

Podsumowanie rejestru szkód: liczba, otwarte, koszty per waluta.

#### Parameters

##### claims

[`DamageClaimEntry`](../api/core/src.md#damageclaimentry)[]

#### Returns

[`DamageSummary`](../api/core/src.md#damagesummary)

***

### summarizeFuel()

> **summarizeFuel**(`entries`): [`FuelStats`](../api/core/src.md#fuelstats)

Defined in: [core/src/billing.ts:432](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/billing.ts#L432)

Zbiorcze statystyki paliwa dla zestawu tankowań (np. jednego pojazdu).

#### Parameters

##### entries

[`FuelStatsEntry`](../api/core/src.md#fuelstatsentry)[]

#### Returns

[`FuelStats`](../api/core/src.md#fuelstats)

***

### summarizeWorkTime()

> **summarizeWorkTime**(`entries`, `opts?`): [`WorkTimeReport`](../api/core/src.md#worktimereport)

Defined in: [core/src/workTime.ts:55](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/workTime.ts#L55)

Liczy ewidencję czasu pracy: wiersze dzienne (praca łącznie + flaga
przekroczenia jazdy) i podsumowanie okresu. Wiersze posortowane wg daty.

#### Parameters

##### entries

[`WorkTimeEntry`](../api/core/src.md#worktimeentry)[]

##### opts?

###### dailyDrivingLimit?

`number`

#### Returns

[`WorkTimeReport`](../api/core/src.md#worktimereport)

***

### sumPerDiem()

> **sumPerDiem**(`results`): [`PerDiemTotal`](../api/core/src.md#perdiemtotal)[]

Defined in: [core/src/perDiem.ts:102](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/perDiem.ts#L102)

Sumuje diety wielu podróży w rozbiciu na waluty (malejąco wg kwoty).

#### Parameters

##### results

[`DietResult`](../api/core/src.md#dietresult)[]

#### Returns

[`PerDiemTotal`](../api/core/src.md#perdiemtotal)[]

***

### toCsv()

> **toCsv**(`headers`, `rows`, `sep?`): `string`

Defined in: [core/src/csv.ts:19](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/csv.ts#L19)

Buduje dokument CSV z nagłówków i wierszy (CRLF; separator domyślnie `;`).

#### Parameters

##### headers

`string`[]

##### rows

[`CsvCell`](../api/core/src.md#csvcell)[][]

##### sep?

`string` = `";"`

#### Returns

`string`

***

### toFakturowniaInvoice()

> **toFakturowniaInvoice**(`input`): [`FakturowniaInvoice`](../api/core/src.md#fakturowniainvoice)

Defined in: [core/src/fakturownia.ts:49](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/fakturownia.ts#L49)

Buduje obiekt `invoice` dla Fakturowni; pomija puste pola. Rzuca, gdy brak pozycji.

#### Parameters

##### input

[`ToFakturowniaInput`](../api/core/src.md#tofakturowniainput)

#### Returns

[`FakturowniaInvoice`](../api/core/src.md#fakturowniainvoice)

***

### toFreightRow()

> **toFreightRow**(`o`): [`FreightRow`](../api/core/src.md#freightrow)

Defined in: [core/src/freightExport.ts:55](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/freightExport.ts#L55)

Mapuje jedno zlecenie na wiersz ogłoszenia frachtu.

#### Parameters

##### o

[`FreightOrderInput`](../api/core/src.md#freightorderinput)

#### Returns

[`FreightRow`](../api/core/src.md#freightrow)

***

### tripProfit()

> **tripProfit**(`revenue`, `cost`): [`TripProfit`](../api/core/src.md#tripprofit)

Defined in: [core/src/billing.ts:178](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/billing.ts#L178)

Zysk z trasy = przychód − koszt (+ marża).

#### Parameters

##### revenue

`number`

##### cost

`number`

#### Returns

[`TripProfit`](../api/core/src.md#tripprofit)

***

### validateChecklistAnswers()

> **validateChecklistAnswers**(`items`, `answers`): `string` \| `null`

Defined in: [core/src/checklists.ts:78](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/checklists.ts#L78)

Walidacja odpowiedzi względem szablonu — komplet pozycji, poprawne typy.

#### Parameters

##### items

[`ChecklistItem`](../api/core/src.md#checklistitem)[]

##### answers

[`ChecklistAnswers`](../api/core/src.md#checklistanswers)

#### Returns

`string` \| `null`

***

### vatSummary()

> **vatSummary**(`items`): [`VatSummaryRow`](../api/core/src.md#vatsummaryrow)[]

Defined in: [core/src/invoice.ts:35](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/invoice.ts#L35)

Podsumowanie VAT wg stawek (wymagane na fakturze przy różnych stawkach).
Grupuje pozycje po `vatRate`, sumuje netto/VAT/brutto, sortuje malejąco wg stawki.

#### Parameters

##### items

`object`[]

#### Returns

[`VatSummaryRow`](../api/core/src.md#vatsummaryrow)[]

***

### vehiclePnl()

> **vehiclePnl**(`input`): [`VehiclePnl`](../api/core/src.md#vehiclepnl)

Defined in: [core/src/vehiclePnl.ts:28](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/vehiclePnl.ts#L28)

Liczy P&L pojazdu. Ujemne wejścia traktowane jak zero.

#### Parameters

##### input

[`VehiclePnlInput`](../api/core/src.md#vehiclepnlinput)

#### Returns

[`VehiclePnl`](../api/core/src.md#vehiclepnl)

***

### visibleModules()

> **visibleModules**(`role`, `modules`, `permissions`): (`"vehicles"` \| `"drivers"` \| `"cards"` \| `"forms"` \| `"reports"` \| `"map"` \| `"stats"` \| `"settlements"` \| `"orders"` \| `"checklists"` \| `"documents"` \| `"damages"`)[]

Defined in: [core/src/catalog.ts:403](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/catalog.ts#L403)

Moduły widoczne (poziom ≥ view) — do nawigacji/kafli.

#### Parameters

##### role

`string`

##### modules

`string`[] \| `null` \| `undefined`

##### permissions

`Partial`\<`Record`\<`"vehicles"` \| `"drivers"` \| `"cards"` \| `"forms"` \| `"reports"` \| `"map"` \| `"stats"` \| `"settlements"` \| `"orders"` \| `"checklists"` \| `"documents"` \| `"damages"`, `"none"` \| `"view"` \| `"edit"`\>\> \| `null` \| `undefined`

#### Returns

(`"vehicles"` \| `"drivers"` \| `"cards"` \| `"forms"` \| `"reports"` \| `"map"` \| `"stats"` \| `"settlements"` \| `"orders"` \| `"checklists"` \| `"documents"` \| `"damages"`)[]

***

### zodFieldErrors()

> **zodFieldErrors**(`error`): `Record`\<`string`, `string`\>

Defined in: [core/src/zodErrors.ts:7](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/core/src/zodErrors.ts#L7)

Mapuje błędy walidacji Zod na `Record<ścieżka-pola, komunikat>` — do podświetlania
pól w formularzach (`errors[path]`). Zastępuje identyczną pętlę kopiowaną w 6 formularzach web.

#### Parameters

##### error

`ZodError`

#### Returns

`Record`\<`string`, `string`\>
