[**e-logistic**](../index.md)

***

[e-logistic](../api/index.md) / maps/src

# maps/src

## Classes

### GraphHopperRoutingProvider

Defined in: [maps/src/graphhopper.ts:48](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/maps/src/graphhopper.ts#L48)

Adapter GraphHopper (hosted). Wymaga klucza API.
UWAGA: implementacja sieciowa nie jest testowana wobec żywego API —
domyślnym dostawcą pozostaje mock; tu jest gotowy szkielet do włączenia.

#### Implements

- [`RoutingProvider`](../api/maps/src.md#routingprovider)

#### Constructors

##### Constructor

> **new GraphHopperRoutingProvider**(`apiKey`, `opts?`): [`GraphHopperRoutingProvider`](../api/maps/src.md#graphhopperroutingprovider)

Defined in: [maps/src/graphhopper.ts:51](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/maps/src/graphhopper.ts#L51)

###### Parameters

###### apiKey

`string`

###### opts?

[`GraphHopperOptions`](../api/maps/src.md#graphhopperoptions) = `{}`

###### Returns

[`GraphHopperRoutingProvider`](../api/maps/src.md#graphhopperroutingprovider)

#### Properties

##### name

> `readonly` **name**: `"graphhopper"` = `"graphhopper"`

Defined in: [maps/src/graphhopper.ts:49](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/maps/src/graphhopper.ts#L49)

###### Implementation of

[`RoutingProvider`](../api/maps/src.md#routingprovider).[`name`](../api/maps/src.md#name-6)

#### Methods

##### route()

> **route**(`req`): `Promise`\<[`RouteResult`](../api/maps/src.md#routeresult)\>

Defined in: [maps/src/graphhopper.ts:56](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/maps/src/graphhopper.ts#L56)

###### Parameters

###### req

[`RouteRequest`](../api/maps/src.md#routerequest)

###### Returns

`Promise`\<[`RouteResult`](../api/maps/src.md#routeresult)\>

###### Implementation of

[`RoutingProvider`](../api/maps/src.md#routingprovider).[`route`](../api/maps/src.md#route-4)

***

### HereRoutingProvider

Defined in: [maps/src/here.ts:150](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/maps/src/here.ts#L150)

Adapter HERE Routing v8 — TIR (wymiary/tonaż), realne myto, ruch (departureTime=now).

#### Implements

- [`RoutingProvider`](../api/maps/src.md#routingprovider)

#### Constructors

##### Constructor

> **new HereRoutingProvider**(`apiKey`): [`HereRoutingProvider`](../api/maps/src.md#hereroutingprovider)

Defined in: [maps/src/here.ts:153](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/maps/src/here.ts#L153)

###### Parameters

###### apiKey

`string`

###### Returns

[`HereRoutingProvider`](../api/maps/src.md#hereroutingprovider)

#### Properties

##### name

> `readonly` **name**: `"here"` = `"here"`

Defined in: [maps/src/here.ts:151](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/maps/src/here.ts#L151)

###### Implementation of

[`RoutingProvider`](../api/maps/src.md#routingprovider).[`name`](../api/maps/src.md#name-6)

#### Methods

##### route()

> **route**(`req`): `Promise`\<[`RouteResult`](../api/maps/src.md#routeresult)\>

Defined in: [maps/src/here.ts:155](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/maps/src/here.ts#L155)

###### Parameters

###### req

[`RouteRequest`](../api/maps/src.md#routerequest)

###### Returns

`Promise`\<[`RouteResult`](../api/maps/src.md#routeresult)\>

###### Implementation of

[`RoutingProvider`](../api/maps/src.md#routingprovider).[`route`](../api/maps/src.md#route-4)

***

### MockRoutingProvider

Defined in: [maps/src/mock.ts:13](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/maps/src/mock.ts#L13)

Provider mock — bez sieci i kluczy. Liczy trasę jako odcinki proste
(haversine) z przybliżonym mytem. Domyślny dostawca na etapie Fazy 2;
realne trasy/myto dostarczą adaptery HERE/GraphHopper.

#### Implements

- [`RoutingProvider`](../api/maps/src.md#routingprovider)

#### Constructors

##### Constructor

> **new MockRoutingProvider**(): [`MockRoutingProvider`](../api/maps/src.md#mockroutingprovider)

###### Returns

[`MockRoutingProvider`](../api/maps/src.md#mockroutingprovider)

#### Properties

##### name

> `readonly` **name**: `"mock"` = `"mock"`

Defined in: [maps/src/mock.ts:14](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/maps/src/mock.ts#L14)

###### Implementation of

[`RoutingProvider`](../api/maps/src.md#routingprovider).[`name`](../api/maps/src.md#name-6)

#### Methods

##### route()

> **route**(`req`): `Promise`\<[`RouteResult`](../api/maps/src.md#routeresult)\>

Defined in: [maps/src/mock.ts:16](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/maps/src/mock.ts#L16)

###### Parameters

###### req

[`RouteRequest`](../api/maps/src.md#routerequest)

###### Returns

`Promise`\<[`RouteResult`](../api/maps/src.md#routeresult)\>

###### Implementation of

[`RoutingProvider`](../api/maps/src.md#routingprovider).[`route`](../api/maps/src.md#route-4)

***

### TomTomRoutingProvider

Defined in: [maps/src/tomtom.ts:112](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/maps/src/tomtom.ts#L112)

Adapter TomTom Routing — TIR (wymiary/tonaż/osie), ruch na żywo, geometria.

#### Implements

- [`RoutingProvider`](../api/maps/src.md#routingprovider)

#### Constructors

##### Constructor

> **new TomTomRoutingProvider**(`apiKey`): [`TomTomRoutingProvider`](../api/maps/src.md#tomtomroutingprovider)

Defined in: [maps/src/tomtom.ts:115](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/maps/src/tomtom.ts#L115)

###### Parameters

###### apiKey

`string`

###### Returns

[`TomTomRoutingProvider`](../api/maps/src.md#tomtomroutingprovider)

#### Properties

##### name

> `readonly` **name**: `"tomtom"` = `"tomtom"`

Defined in: [maps/src/tomtom.ts:113](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/maps/src/tomtom.ts#L113)

###### Implementation of

[`RoutingProvider`](../api/maps/src.md#routingprovider).[`name`](../api/maps/src.md#name-6)

#### Methods

##### route()

> **route**(`req`): `Promise`\<[`RouteResult`](../api/maps/src.md#routeresult)\>

Defined in: [maps/src/tomtom.ts:117](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/maps/src/tomtom.ts#L117)

###### Parameters

###### req

[`RouteRequest`](../api/maps/src.md#routerequest)

###### Returns

`Promise`\<[`RouteResult`](../api/maps/src.md#routeresult)\>

###### Implementation of

[`RoutingProvider`](../api/maps/src.md#routingprovider).[`route`](../api/maps/src.md#route-4)

## Interfaces

### BBox

Defined in: [maps/src/poi.ts:5](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/maps/src/poi.ts#L5)

#### Properties

##### east

> **east**: `number`

Defined in: [maps/src/poi.ts:9](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/maps/src/poi.ts#L9)

##### north

> **north**: `number`

Defined in: [maps/src/poi.ts:8](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/maps/src/poi.ts#L8)

##### south

> **south**: `number`

Defined in: [maps/src/poi.ts:6](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/maps/src/poi.ts#L6)

##### west

> **west**: `number`

Defined in: [maps/src/poi.ts:7](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/maps/src/poi.ts#L7)

***

### BBoxLngLat

Defined in: [maps/src/heretraffic.ts:8](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/maps/src/heretraffic.ts#L8)

#### Properties

##### east

> **east**: `number`

Defined in: [maps/src/heretraffic.ts:11](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/maps/src/heretraffic.ts#L11)

##### north

> **north**: `number`

Defined in: [maps/src/heretraffic.ts:12](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/maps/src/heretraffic.ts#L12)

##### south

> **south**: `number`

Defined in: [maps/src/heretraffic.ts:10](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/maps/src/heretraffic.ts#L10)

##### west

> **west**: `number`

Defined in: [maps/src/heretraffic.ts:9](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/maps/src/heretraffic.ts#L9)

***

### FuelPriceQuery

Defined in: [maps/src/fuelprice.ts:20](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/maps/src/fuelprice.ts#L20)

#### Properties

##### lat

> **lat**: `number`

Defined in: [maps/src/fuelprice.ts:21](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/maps/src/fuelprice.ts#L21)

##### lng

> **lng**: `number`

Defined in: [maps/src/fuelprice.ts:22](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/maps/src/fuelprice.ts#L22)

##### radiusKm?

> `optional` **radiusKm?**: `number`

Defined in: [maps/src/fuelprice.ts:24](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/maps/src/fuelprice.ts#L24)

Promień w km (Tankerkönig: maks. 25).

***

### FuelStationPrice

Defined in: [maps/src/fuelprice.ts:7](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/maps/src/fuelprice.ts#L7)

Ceny paliwa na stacjach — adapter Tankerkönig (Niemcy, darmowy klucz API).
Klucz czytany po stronie serwera; tu jest tylko logika zapytania + normalizacja.
Inne kraje wymagają osobnych dostawców (brak jednego darmowego źródła EU).

#### Properties

##### brand

> **brand**: `string`

Defined in: [maps/src/fuelprice.ts:10](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/maps/src/fuelprice.ts#L10)

##### diesel

> **diesel**: `number` \| `null`

Defined in: [maps/src/fuelprice.ts:13](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/maps/src/fuelprice.ts#L13)

##### distKm

> **distKm**: `number` \| `null`

Defined in: [maps/src/fuelprice.ts:17](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/maps/src/fuelprice.ts#L17)

##### e10

> **e10**: `number` \| `null`

Defined in: [maps/src/fuelprice.ts:15](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/maps/src/fuelprice.ts#L15)

##### e5

> **e5**: `number` \| `null`

Defined in: [maps/src/fuelprice.ts:14](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/maps/src/fuelprice.ts#L14)

##### id

> **id**: `string`

Defined in: [maps/src/fuelprice.ts:8](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/maps/src/fuelprice.ts#L8)

##### isOpen

> **isOpen**: `boolean`

Defined in: [maps/src/fuelprice.ts:16](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/maps/src/fuelprice.ts#L16)

##### lat

> **lat**: `number`

Defined in: [maps/src/fuelprice.ts:11](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/maps/src/fuelprice.ts#L11)

##### lng

> **lng**: `number`

Defined in: [maps/src/fuelprice.ts:12](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/maps/src/fuelprice.ts#L12)

##### name

> **name**: `string`

Defined in: [maps/src/fuelprice.ts:9](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/maps/src/fuelprice.ts#L9)

***

### GeoHit

Defined in: [maps/src/geocode.ts:7](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/maps/src/geocode.ts#L7)

Geokoder: zamiana nazwy miejsca (miasto/adres/POI) na współrzędne.
Pierwszy wybór: MapTiler (gdy jest klucz). Fallback: Nominatim (OSM, bez klucza).
Działa po stronie klienta — klucz MapTiler jest publiczny (NEXT_PUBLIC).

#### Properties

##### label

> **label**: `string`

Defined in: [maps/src/geocode.ts:8](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/maps/src/geocode.ts#L8)

##### lat

> **lat**: `number`

Defined in: [maps/src/geocode.ts:9](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/maps/src/geocode.ts#L9)

##### lng

> **lng**: `number`

Defined in: [maps/src/geocode.ts:10](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/maps/src/geocode.ts#L10)

***

### GraphHopperOptions

Defined in: [maps/src/graphhopper.ts:18](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/maps/src/graphhopper.ts#L18)

#### Properties

##### truckProfile?

> `optional` **truckProfile?**: `boolean`

Defined in: [maps/src/graphhopper.ts:20](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/maps/src/graphhopper.ts#L20)

Włącz profile TIR (truck/small_truck) — wymaga planu płatnego GraphHopper.

***

### GridIndex

Defined in: [maps/src/gridIndex.ts:10](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/maps/src/gridIndex.ts#L10)

Kratowy indeks przestrzenny (#261) — zamiast O(n·m) „każdy POI × każdy punkt
trasy" robimy O(n) z małą stałą: punkty wpadają do komórek ~cellKm, zapytanie
sprawdza tylko sąsiedztwo komórki kandydata (3 wiersze × poszerzenie na
długości geograficznej wg cos(lat)), a dokładność domyka haversine.

#### Properties

##### cellKm

> **cellKm**: `number`

Defined in: [maps/src/gridIndex.ts:11](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/maps/src/gridIndex.ts#L11)

##### cells

> **cells**: `Map`\<`string`, [`LatLng`](../api/maps/src.md#latlng)[]\>

Defined in: [maps/src/gridIndex.ts:13](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/maps/src/gridIndex.ts#L13)

klucz "iy:ix" → punkty w komórce

***

### LatLng

Defined in: [maps/src/types.ts:3](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/maps/src/types.ts#L3)

Wspólne typy warstwy map E-Logistic (niezależne od dostawcy).

#### Properties

##### lat

> **lat**: `number`

Defined in: [maps/src/types.ts:4](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/maps/src/types.ts#L4)

##### lng

> **lng**: `number`

Defined in: [maps/src/types.ts:5](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/maps/src/types.ts#L5)

***

### OverpassResponse

Defined in: [maps/src/poi.ts:47](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/maps/src/poi.ts#L47)

#### Properties

##### elements?

> `optional` **elements?**: `OverpassElement`[]

Defined in: [maps/src/poi.ts:48](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/maps/src/poi.ts#L48)

***

### Poi

Defined in: [maps/src/poi.ts:12](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/maps/src/poi.ts#L12)

#### Properties

##### id

> **id**: `string`

Defined in: [maps/src/poi.ts:13](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/maps/src/poi.ts#L13)

##### lat

> **lat**: `number`

Defined in: [maps/src/poi.ts:16](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/maps/src/poi.ts#L16)

##### lng

> **lng**: `number`

Defined in: [maps/src/poi.ts:17](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/maps/src/poi.ts#L17)

##### name?

> `optional` **name?**: `string`

Defined in: [maps/src/poi.ts:15](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/maps/src/poi.ts#L15)

##### tags

> **tags**: `Record`\<`string`, `string`\>

Defined in: [maps/src/poi.ts:18](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/maps/src/poi.ts#L18)

##### type

> **type**: [`OsmPoiType`](../api/maps/src.md#osmpoitype)

Defined in: [maps/src/poi.ts:14](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/maps/src/poi.ts#L14)

***

### ReverseHit

Defined in: [maps/src/tomtomSearch.ts:67](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/maps/src/tomtomSearch.ts#L67)

#### Properties

##### city

> **city**: `string`

Defined in: [maps/src/tomtomSearch.ts:69](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/maps/src/tomtomSearch.ts#L69)

##### country

> **country**: `string`

Defined in: [maps/src/tomtomSearch.ts:68](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/maps/src/tomtomSearch.ts#L68)

##### label

> **label**: `string`

Defined in: [maps/src/tomtomSearch.ts:71](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/maps/src/tomtomSearch.ts#L71)

##### postcode

> **postcode**: `string`

Defined in: [maps/src/tomtomSearch.ts:70](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/maps/src/tomtomSearch.ts#L70)

***

### RouteOptions

Defined in: [maps/src/types.ts:22](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/maps/src/types.ts#L22)

Opcje omijania (kraje, płatne drogi, promy, autokoszetki, drogi gruntowe).

#### Properties

##### avoidCarTrains?

> `optional` **avoidCarTrains?**: `boolean`

Defined in: [maps/src/types.ts:26](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/maps/src/types.ts#L26)

##### avoidCountries?

> `optional` **avoidCountries?**: `string`[]

Defined in: [maps/src/types.ts:23](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/maps/src/types.ts#L23)

##### avoidDirtRoads?

> `optional` **avoidDirtRoads?**: `boolean`

Defined in: [maps/src/types.ts:27](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/maps/src/types.ts#L27)

##### avoidFerries?

> `optional` **avoidFerries?**: `boolean`

Defined in: [maps/src/types.ts:25](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/maps/src/types.ts#L25)

##### avoidTolls?

> `optional` **avoidTolls?**: `boolean`

Defined in: [maps/src/types.ts:24](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/maps/src/types.ts#L24)

***

### RouteRequest

Defined in: [maps/src/types.ts:30](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/maps/src/types.ts#L30)

#### Properties

##### currency?

> `optional` **currency?**: `string`

Defined in: [maps/src/types.ts:35](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/maps/src/types.ts#L35)

##### options?

> `optional` **options?**: [`RouteOptions`](../api/maps/src.md#routeoptions)

Defined in: [maps/src/types.ts:34](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/maps/src/types.ts#L34)

##### profile?

> `optional` **profile?**: [`VehicleProfile`](../api/maps/src.md#vehicleprofile)

Defined in: [maps/src/types.ts:33](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/maps/src/types.ts#L33)

##### waypoints

> **waypoints**: [`LatLng`](../api/maps/src.md#latlng)[]

Defined in: [maps/src/types.ts:32](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/maps/src/types.ts#L32)

Min. 2 punkty (start, ewentualne przystanki, cel).

***

### RouteResult

Defined in: [maps/src/types.ts:47](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/maps/src/types.ts#L47)

#### Properties

##### currency

> **currency**: `string`

Defined in: [maps/src/types.ts:51](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/maps/src/types.ts#L51)

##### distanceKm

> **distanceKm**: `number`

Defined in: [maps/src/types.ts:48](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/maps/src/types.ts#L48)

##### durationMin

> **durationMin**: `number`

Defined in: [maps/src/types.ts:49](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/maps/src/types.ts#L49)

##### geometry

> **geometry**: [`LatLng`](../api/maps/src.md#latlng)[]

Defined in: [maps/src/types.ts:55](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/maps/src/types.ts#L55)

Punkty linii trasy do narysowania na mapie.

##### provider

> **provider**: `string`

Defined in: [maps/src/types.ts:56](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/maps/src/types.ts#L56)

##### segments

> **segments**: [`RouteSegment`](../api/maps/src.md#routesegment)[]

Defined in: [maps/src/types.ts:53](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/maps/src/types.ts#L53)

Koszt myta z podziałem na odcinki (wymóg ze specyfikacji).

##### tollCost

> **tollCost**: `number`

Defined in: [maps/src/types.ts:50](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/maps/src/types.ts#L50)

***

### RouteSegment

Defined in: [maps/src/types.ts:38](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/maps/src/types.ts#L38)

#### Properties

##### distanceKm

> **distanceKm**: `number`

Defined in: [maps/src/types.ts:41](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/maps/src/types.ts#L41)

##### durationMin

> **durationMin**: `number`

Defined in: [maps/src/types.ts:44](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/maps/src/types.ts#L44)

Czas jazdy odcinka [min] — #269: ETA per przystanek.

##### from

> **from**: [`LatLng`](../api/maps/src.md#latlng)

Defined in: [maps/src/types.ts:39](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/maps/src/types.ts#L39)

##### to

> **to**: [`LatLng`](../api/maps/src.md#latlng)

Defined in: [maps/src/types.ts:40](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/maps/src/types.ts#L40)

##### tollCost

> **tollCost**: `number`

Defined in: [maps/src/types.ts:42](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/maps/src/types.ts#L42)

***

### RoutingConfig

Defined in: [maps/src/factory.ts:9](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/maps/src/factory.ts#L9)

#### Properties

##### apiKey?

> `optional` **apiKey?**: `string`

Defined in: [maps/src/factory.ts:11](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/maps/src/factory.ts#L11)

##### graphHopperTruckProfile?

> `optional` **graphHopperTruckProfile?**: `boolean`

Defined in: [maps/src/factory.ts:13](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/maps/src/factory.ts#L13)

GraphHopper: włącz profile TIR (wymaga planu płatnego). Domyślnie false (free tier = car).

##### provider?

> `optional` **provider?**: [`RoutingProviderName`](../api/maps/src.md#routingprovidername-1)

Defined in: [maps/src/factory.ts:10](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/maps/src/factory.ts#L10)

***

### RoutingProvider

Defined in: [maps/src/types.ts:60](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/maps/src/types.ts#L60)

Abstrakcja dostawcy routingu — adaptery: mock, GraphHopper, HERE.

#### Properties

##### name

> `readonly` **name**: `string`

Defined in: [maps/src/types.ts:61](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/maps/src/types.ts#L61)

#### Methods

##### route()

> **route**(`req`): `Promise`\<[`RouteResult`](../api/maps/src.md#routeresult)\>

Defined in: [maps/src/types.ts:62](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/maps/src/types.ts#L62)

###### Parameters

###### req

[`RouteRequest`](../api/maps/src.md#routerequest)

###### Returns

`Promise`\<[`RouteResult`](../api/maps/src.md#routeresult)\>

***

### TomTomPoi

Defined in: [maps/src/tomtomSearch.ts:107](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/maps/src/tomtomSearch.ts#L107)

#### Properties

##### address

> **address**: `string`

Defined in: [maps/src/tomtomSearch.ts:112](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/maps/src/tomtomSearch.ts#L112)

##### distanceM?

> `optional` **distanceM?**: `number`

Defined in: [maps/src/tomtomSearch.ts:113](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/maps/src/tomtomSearch.ts#L113)

##### id

> **id**: `string`

Defined in: [maps/src/tomtomSearch.ts:108](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/maps/src/tomtomSearch.ts#L108)

##### lat

> **lat**: `number`

Defined in: [maps/src/tomtomSearch.ts:110](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/maps/src/tomtomSearch.ts#L110)

##### lng

> **lng**: `number`

Defined in: [maps/src/tomtomSearch.ts:111](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/maps/src/tomtomSearch.ts#L111)

##### name

> **name**: `string`

Defined in: [maps/src/tomtomSearch.ts:109](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/maps/src/tomtomSearch.ts#L109)

***

### TrafficFlow

Defined in: [maps/src/heretraffic.ts:16](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/maps/src/heretraffic.ts#L16)

Odcinek ruchu: kształt + jamFactor (0 = płynnie, 10 = zablokowane).

#### Properties

##### jamFactor

> **jamFactor**: `number`

Defined in: [maps/src/heretraffic.ts:18](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/maps/src/heretraffic.ts#L18)

##### shape

> **shape**: [`LatLng`](../api/maps/src.md#latlng)[]

Defined in: [maps/src/heretraffic.ts:17](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/maps/src/heretraffic.ts#L17)

***

### TrafficIncident

Defined in: [maps/src/tomtomTraffic.ts:10](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/maps/src/tomtomTraffic.ts#L10)

#### Properties

##### description

> **description**: `string`

Defined in: [maps/src/tomtomTraffic.ts:15](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/maps/src/tomtomTraffic.ts#L15)

##### iconCategory

> **iconCategory**: `number`

Defined in: [maps/src/tomtomTraffic.ts:14](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/maps/src/tomtomTraffic.ts#L14)

Kod ikony TomTom (1..14): 1 accident, 6 jam, 7 roadworks, 8 closure…

##### id

> **id**: `string`

Defined in: [maps/src/tomtomTraffic.ts:11](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/maps/src/tomtomTraffic.ts#L11)

##### point

> **point**: [`LatLng`](../api/maps/src.md#latlng)

Defined in: [maps/src/tomtomTraffic.ts:17](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/maps/src/tomtomTraffic.ts#L17)

Punkt reprezentatywny zdarzenia.

##### severity

> **severity**: [`TrafficSeverity`](../api/maps/src.md#trafficseverity)

Defined in: [maps/src/tomtomTraffic.ts:12](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/maps/src/tomtomTraffic.ts#L12)

***

### VehicleProfile

Defined in: [maps/src/types.ts:11](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/maps/src/types.ts#L11)

Profil pojazdu wpływający na routing TIR.

#### Properties

##### axleCount?

> `optional` **axleCount?**: `number`

Defined in: [maps/src/types.ts:18](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/maps/src/types.ts#L18)

Liczba osi (HERE: truck[axleCount]; domyślnie 5 dla zestawu).

##### heightCm?

> `optional` **heightCm?**: `number`

Defined in: [maps/src/types.ts:13](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/maps/src/types.ts#L13)

##### kind?

> `optional` **kind?**: [`VehicleKind`](../api/maps/src.md#vehiclekind)

Defined in: [maps/src/types.ts:12](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/maps/src/types.ts#L12)

##### lengthCm?

> `optional` **lengthCm?**: `number`

Defined in: [maps/src/types.ts:15](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/maps/src/types.ts#L15)

##### weightKg?

> `optional` **weightKg?**: `number`

Defined in: [maps/src/types.ts:16](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/maps/src/types.ts#L16)

##### widthCm?

> `optional` **widthCm?**: `number`

Defined in: [maps/src/types.ts:14](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/maps/src/types.ts#L14)

## Type Aliases

### OsmPoiType

> **OsmPoiType** = `"parking"` \| `"fuel_station"`

Defined in: [maps/src/poi.ts:3](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/maps/src/poi.ts#L3)

POI z OpenStreetMap (Overpass API) — bez klucza. Parkingi TIR i stacje paliw.

***

### RoutingProviderName

> **RoutingProviderName** = `"mock"` \| `"graphhopper"` \| `"here"` \| `"tomtom"`

Defined in: [maps/src/factory.ts:7](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/maps/src/factory.ts#L7)

***

### TrafficSeverity

> **TrafficSeverity** = `"unknown"` \| `"minor"` \| `"moderate"` \| `"major"` \| `"closure"`

Defined in: [maps/src/tomtomTraffic.ts:8](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/maps/src/tomtomTraffic.ts#L8)

***

### VehicleKind

> **VehicleKind** = `"truck"` \| `"tractor"` \| `"van"` \| `"trailer"` \| `"other"`

Defined in: [maps/src/types.ts:8](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/maps/src/types.ts#L8)

## Variables

### TOMTOM\_BASE

> `const` **TOMTOM\_BASE**: `"https://api.tomtom.com"` = `"https://api.tomtom.com"`

Defined in: [maps/src/tomtom.ts:11](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/maps/src/tomtom.ts#L11)

***

### TOMTOM\_CATEGORY

> `const` **TOMTOM\_CATEGORY**: `object`

Defined in: [maps/src/tomtomSearch.ts:11](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/maps/src/tomtomSearch.ts#L11)

Kategorie POI TomTom istotne dla TIR-ów.

#### Type Declaration

##### fuel

> `readonly` **fuel**: `7311` = `7311`

##### parking

> `readonly` **parking**: `7369` = `7369`

##### restArea

> `readonly` **restArea**: `7395` = `7395`

##### truckStop

> `readonly` **truckStop**: `9663` = `9663`

## Functions

### anyWithinKm()

> **anyWithinKm**(`index`, `p`, `radiusKm`): `boolean`

Defined in: [maps/src/gridIndex.ts:31](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/maps/src/gridIndex.ts#L31)

Czy jakikolwiek punkt indeksu leży ≤ radiusKm od `p` (radius ≤ cellKm).

#### Parameters

##### index

[`GridIndex`](../api/maps/src.md#gridindex)

##### p

[`LatLng`](../api/maps/src.md#latlng)

##### radiusKm

`number`

#### Returns

`boolean`

***

### buildGraphHopperBody()

> **buildGraphHopperBody**(`req`, `opts?`): `Record`\<`string`, `unknown`\>

Defined in: [maps/src/graphhopper.ts:24](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/maps/src/graphhopper.ts#L24)

Buduje ciało żądania GraphHopper Routing API (czyste, testowalne).

#### Parameters

##### req

[`RouteRequest`](../api/maps/src.md#routerequest)

##### opts?

[`GraphHopperOptions`](../api/maps/src.md#graphhopperoptions) = `{}`

#### Returns

`Record`\<`string`, `unknown`\>

***

### buildGridIndex()

> **buildGridIndex**(`points`, `cellKm`): [`GridIndex`](../api/maps/src.md#gridindex)

Defined in: [maps/src/gridIndex.ts:18](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/maps/src/gridIndex.ts#L18)

#### Parameters

##### points

[`LatLng`](../api/maps/src.md#latlng)[]

##### cellKm

`number`

#### Returns

[`GridIndex`](../api/maps/src.md#gridindex)

***

### buildHereTrafficUrl()

> **buildHereTrafficUrl**(`bbox`, `apiKey`): `string`

Defined in: [maps/src/heretraffic.ts:22](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/maps/src/heretraffic.ts#L22)

URL do HERE Traffic v7 flow dla prostokąta (bbox: west,south,east,north).

#### Parameters

##### bbox

[`BBoxLngLat`](../api/maps/src.md#bboxlnglat)

##### apiKey

`string`

#### Returns

`string`

***

### buildHereUrl()

> **buildHereUrl**(`req`, `apiKey`, `departureTime?`): `string`

Defined in: [maps/src/here.ts:40](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/maps/src/here.ts#L40)

Buduje URL HERE Routing v8 (czyste, testowalne). Brackets zostają literalne.

#### Parameters

##### req

[`RouteRequest`](../api/maps/src.md#routerequest)

##### apiKey

`string`

##### departureTime?

`string`

#### Returns

`string`

***

### buildOverpassQuery()

> **buildOverpassQuery**(`bbox`, `types`): `string`

Defined in: [maps/src/poi.ts:24](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/maps/src/poi.ts#L24)

Buduje zapytanie Overpass QL dla wskazanego obszaru i typów POI.

#### Parameters

##### bbox

[`BBox`](../api/maps/src.md#bbox)

##### types

[`OsmPoiType`](../api/maps/src.md#osmpoitype)[]

#### Returns

`string`

***

### buildTankerkonigUrl()

> **buildTankerkonigUrl**(`q`, `apiKey`): `string`

Defined in: [maps/src/fuelprice.ts:30](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/maps/src/fuelprice.ts#L30)

Buduje URL zapytania Tankerkönig (czyste, testowalne).

#### Parameters

##### q

[`FuelPriceQuery`](../api/maps/src.md#fuelpricequery)

##### apiKey

`string`

#### Returns

`string`

***

### buildTomTomRouteUrl()

> **buildTomTomRouteUrl**(`req`, `apiKey`): `string`

Defined in: [maps/src/tomtom.ts:32](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/maps/src/tomtom.ts#L32)

Buduje URL TomTom Routing (czyste/testowalne). Lokalizacje literalne w ścieżce.

#### Parameters

##### req

[`RouteRequest`](../api/maps/src.md#routerequest)

##### apiKey

`string`

#### Returns

`string`

***

### createRoutingProvider()

> **createRoutingProvider**(`config?`): [`RoutingProvider`](../api/maps/src.md#routingprovider)

Defined in: [maps/src/factory.ts:17](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/maps/src/factory.ts#L17)

Wybiera dostawcę routingu wg konfiguracji (domyślnie mock — bez klucza).

#### Parameters

##### config?

[`RoutingConfig`](../api/maps/src.md#routingconfig) = `{}`

#### Returns

[`RoutingProvider`](../api/maps/src.md#routingprovider)

***

### decodeFlexiblePolyline()

> **decodeFlexiblePolyline**(`encoded`): [`LatLng`](../api/maps/src.md#latlng)[]

Defined in: [maps/src/here.ts:111](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/maps/src/here.ts#L111)

Dekoduje HERE flexible polyline do listy punktów (ignoruje 3. wymiar).

#### Parameters

##### encoded

`string`

#### Returns

[`LatLng`](../api/maps/src.md#latlng)[]

***

### estimateTollEur()

> **estimateTollEur**(`distanceKm`, `opts?`): `number`

Defined in: [maps/src/toll.ts:23](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/maps/src/toll.ts#L23)

Szacunkowe myto [EUR] dla dystansu. Używane przez provider mock oraz do
uzupełnienia wyników dostawców, którzy nie zwracają myta (np. GraphHopper free).
Świadome przybliżenie (nie cała trasa płatna) — UI oznacza wynik jako „szac.".

#### Parameters

##### distanceKm

`number`

##### opts?

###### avoidTolls?

`boolean`

###### weightKg?

`number`

#### Returns

`number`

***

### estimateTruckDurationMin()

> **estimateTruckDurationMin**(`distanceKm`): `number`

Defined in: [maps/src/toll.ts:35](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/maps/src/toll.ts#L35)

Szacunkowy czas jazdy TIR [min] z dystansu — realna średnia prędkość ciężarówki.
Używane gdy dostawca nie zwraca czasu TIR (mock, GraphHopper na profilu „car").

#### Parameters

##### distanceKm

`number`

#### Returns

`number`

***

### fetchFuelPrices()

> **fetchFuelPrices**(`q`, `apiKey`): `Promise`\<[`FuelStationPrice`](../api/maps/src.md#fuelstationprice)[]\>

Defined in: [maps/src/fuelprice.ts:80](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/maps/src/fuelprice.ts#L80)

Pobiera ceny paliwa z Tankerkönig dla okolicy punktu (wymaga klucza API).

#### Parameters

##### q

[`FuelPriceQuery`](../api/maps/src.md#fuelpricequery)

##### apiKey

`string`

#### Returns

`Promise`\<[`FuelStationPrice`](../api/maps/src.md#fuelstationprice)[]\>

***

### fetchPois()

> **fetchPois**(`bbox`, `types?`, `url?`): `Promise`\<[`Poi`](../api/maps/src.md#poi)[]\>

Defined in: [maps/src/poi.ts:77](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/maps/src/poi.ts#L77)

Pobiera POI z Overpass dla danego obszaru (bez klucza; CORS dozwolony).

#### Parameters

##### bbox

[`BBox`](../api/maps/src.md#bbox)

##### types?

[`OsmPoiType`](../api/maps/src.md#osmpoitype)[] = `...`

##### url?

`string` = `OVERPASS_URL`

#### Returns

`Promise`\<[`Poi`](../api/maps/src.md#poi)[]\>

***

### geocode()

> **geocode**(`query`, `opts?`): `Promise`\<[`GeoHit`](../api/maps/src.md#geohit)[]\>

Defined in: [maps/src/geocode.ts:61](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/maps/src/geocode.ts#L61)

Wyszukuje miejsce. Priorytet: TomTom (najlepsza jakość, #356) → MapTiler →
Nominatim (OSM, bez klucza). Każde źródło z fallbackiem na Nominatim.

#### Parameters

##### query

`string`

##### opts?

###### limit?

`number`

###### maptilerKey?

`string`

###### tomtomKey?

`string`

#### Returns

`Promise`\<[`GeoHit`](../api/maps/src.md#geohit)[]\>

***

### graphHopperProfile()

> **graphHopperProfile**(`kind?`): `string`

Defined in: [maps/src/graphhopper.ts:5](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/maps/src/graphhopper.ts#L5)

Mapuje typ pojazdu E-Logistic na profil GraphHopper.

#### Parameters

##### kind?

[`VehicleKind`](../api/maps/src.md#vehiclekind)

#### Returns

`string`

***

### haversineKm()

> **haversineKm**(`a`, `b`): `number`

Defined in: [maps/src/geo.ts:10](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/maps/src/geo.ts#L10)

Odległość po wielkim okręgu (haversine) w kilometrach.

#### Parameters

##### a

[`LatLng`](../api/maps/src.md#latlng)

##### b

[`LatLng`](../api/maps/src.md#latlng)

#### Returns

`number`

***

### itemsNearRoute()

> **itemsNearRoute**\<`T`\>(`items`, `route`, `maxKm`): `T` & `object`[]

Defined in: [maps/src/disruptions.ts:23](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/maps/src/disruptions.ts#L23)

Elementy (zgłoszenia/POI) w promieniu `maxKm` od trasy — posortowane rosnąco
wg odległości, z dołączonym polem `distanceKm`. Pusta trasa → pusto.

#### Type Parameters

##### T

`T` *extends* [`LatLng`](../api/maps/src.md#latlng)

#### Parameters

##### items

`T`[]

##### route

[`LatLng`](../api/maps/src.md#latlng)[]

##### maxKm

`number`

#### Returns

`T` & `object`[]

***

### jamSeverity()

> **jamSeverity**(`jamFactor`): `"free"` \| `"moderate"` \| `"heavy"` \| `"blocked"`

Defined in: [maps/src/heretraffic.ts:33](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/maps/src/heretraffic.ts#L33)

Kategoria natężenia z jamFactor — do kolorowania warstwy.

#### Parameters

##### jamFactor

`number`

#### Returns

`"free"` \| `"moderate"` \| `"heavy"` \| `"blocked"`

***

### parseHereTraffic()

> **parseHereTraffic**(`json`): [`TrafficFlow`](../api/maps/src.md#trafficflow)[]

Defined in: [maps/src/heretraffic.ts:50](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/maps/src/heretraffic.ts#L50)

Parsuje odpowiedź HERE Traffic v7 flow → lista odcinków z kształtem i jamFactor.

#### Parameters

##### json

`unknown`

#### Returns

[`TrafficFlow`](../api/maps/src.md#trafficflow)[]

***

### parseOverpass()

> **parseOverpass**(`data`): [`Poi`](../api/maps/src.md#poi)[]

Defined in: [maps/src/poi.ts:52](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/maps/src/poi.ts#L52)

Mapuje odpowiedź Overpass na listę POI (pomija elementy bez współrzędnych).

#### Parameters

##### data

[`OverpassResponse`](../api/maps/src.md#overpassresponse)

#### Returns

[`Poi`](../api/maps/src.md#poi)[]

***

### parseTankerkonig()

> **parseTankerkonig**(`data`): [`FuelStationPrice`](../api/maps/src.md#fuelstationprice)[]

Defined in: [maps/src/fuelprice.ts:62](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/maps/src/fuelprice.ts#L62)

Normalizuje odpowiedź Tankerkönig do wspólnego typu (ceny < 0 → null).

#### Parameters

##### data

`TkResponse`

#### Returns

[`FuelStationPrice`](../api/maps/src.md#fuelstationprice)[]

***

### parseTomTomRoute()

> **parseTomTomRoute**(`data`, `provider`, `currency`): [`RouteResult`](../api/maps/src.md#routeresult)

Defined in: [maps/src/tomtom.ts:85](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/maps/src/tomtom.ts#L85)

Parsuje odpowiedź TomTom Routing do wspólnego `RouteResult`.

#### Parameters

##### data

`TTRouteResponse`

##### provider

`string`

##### currency

`string`

#### Returns

[`RouteResult`](../api/maps/src.md#routeresult)

***

### pointToRouteKm()

> **pointToRouteKm**(`point`, `route`): `number`

Defined in: [maps/src/disruptions.ts:10](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/maps/src/disruptions.ts#L10)

Minimalna odległość punktu do trasy (po wierzchołkach geometrii), w km.

#### Parameters

##### point

[`LatLng`](../api/maps/src.md#latlng)

##### route

[`LatLng`](../api/maps/src.md#latlng)[]

#### Returns

`number`

***

### routeMultiLeg()

> **routeMultiLeg**(`provider`, `req`): `Promise`\<[`RouteResult`](../api/maps/src.md#routeresult)\>

Defined in: [maps/src/multileg.ts:9](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/maps/src/multileg.ts#L9)

Liczy trasę przez wiele punktów (start + przystanki + cel) jako sumę odcinków.
Każdy odcinek to osobne zapytanie do dostawcy — dzięki temu mamy myto i dystans
z podziałem na odcinki (wymóg ze specyfikacji), niezależnie od dostawcy.

#### Parameters

##### provider

[`RoutingProvider`](../api/maps/src.md#routingprovider)

##### req

[`RouteRequest`](../api/maps/src.md#routerequest)

#### Returns

`Promise`\<[`RouteResult`](../api/maps/src.md#routeresult)\>

***

### tollWeightFactor()

> **tollWeightFactor**(`weightKg?`): `number`

Defined in: [maps/src/toll.ts:11](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/maps/src/toll.ts#L11)

Mnożnik myta wg masy pojazdu (cięższy = droższe myto). Przybliżenie.

#### Parameters

##### weightKg?

`number`

#### Returns

`number`

***

### tomtomFetch()

> **tomtomFetch**(`url`, `init?`): `Promise`\<`Response`\>

Defined in: [maps/src/tomtom.ts:18](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/maps/src/tomtom.ts#L18)

fetch z twardym timeoutem — API mapowe bywa wolne; nie wieszamy UI (#354).

#### Parameters

##### url

`string`

##### init?

`RequestInit` & `object`

#### Returns

`Promise`\<`Response`\>

***

### tomtomGeocode()

> **tomtomGeocode**(`query`, `apiKey`, `opts?`): `Promise`\<[`GeoHit`](../api/maps/src.md#geohit)[]\>

Defined in: [maps/src/tomtomSearch.ts:37](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/maps/src/tomtomSearch.ts#L37)

Geokoder TomTom (fuzzy search: adres/miasto/POI/marka). Zwraca `GeoHit[]`.

#### Parameters

##### query

`string`

##### apiKey

`string`

##### opts?

###### countrySet?

`string`

###### language?

`string`

###### limit?

`number`

###### near?

[`LatLng`](../api/maps/src.md#latlng)

#### Returns

`Promise`\<[`GeoHit`](../api/maps/src.md#geohit)[]\>

***

### tomtomNearby()

> **tomtomNearby**(`lat`, `lng`, `apiKey`, `opts?`): `Promise`\<[`TomTomPoi`](../api/maps/src.md#tomtompoi)[]\>

Defined in: [maps/src/tomtomSearch.ts:134](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/maps/src/tomtomSearch.ts#L134)

POI w pobliżu (domyślnie stacje paliw + parkingi + truck stopy).

#### Parameters

##### lat

`number`

##### lng

`number`

##### apiKey

`string`

##### opts?

###### categorySet?

`string`

###### language?

`string`

###### limit?

`number`

###### radiusM?

`number`

#### Returns

`Promise`\<[`TomTomPoi`](../api/maps/src.md#tomtompoi)[]\>

***

### tomtomReverseGeocode()

> **tomtomReverseGeocode**(`lat`, `lng`, `apiKey`, `opts?`): `Promise`\<[`ReverseHit`](../api/maps/src.md#reversehit) \| `null`\>

Defined in: [maps/src/tomtomSearch.ts:87](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/maps/src/tomtomSearch.ts#L87)

Reverse-geocode TomTom (GPS → kraj/miasto/kod pocztowy) — do autouzupełniania formularzy.

#### Parameters

##### lat

`number`

##### lng

`number`

##### apiKey

`string`

##### opts?

###### language?

`string`

#### Returns

`Promise`\<[`ReverseHit`](../api/maps/src.md#reversehit) \| `null`\>

***

### tomtomSearchAlongRoute()

> **tomtomSearchAlongRoute**(`routePoints`, `query`, `apiKey`, `opts?`): `Promise`\<[`TomTomPoi`](../api/maps/src.md#tomtompoi)[]\>

Defined in: [maps/src/tomtomSearch.ts:163](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/maps/src/tomtomSearch.ts#L163)

Szukanie WZDŁUŻ TRASY — POI (paliwo/parking/…) blisko wytyczonej trasy, w
granicy dodatkowego objazdu `maxDetourSec`. Kluczowe dla TIR: „gdzie zatankować po drodze".

#### Parameters

##### routePoints

[`LatLng`](../api/maps/src.md#latlng)[]

##### query

`string`

##### apiKey

`string`

##### opts?

###### categorySet?

`string`

###### limit?

`number`

###### maxDetourSec?

`number`

#### Returns

`Promise`\<[`TomTomPoi`](../api/maps/src.md#tomtompoi)[]\>

***

### tomtomTrafficIncidents()

> **tomtomTrafficIncidents**(`bbox`, `apiKey`, `opts?`): `Promise`\<[`TrafficIncident`](../api/maps/src.md#trafficincident)[]\>

Defined in: [maps/src/tomtomTraffic.ts:53](https://github.com/Gh0s777tt/E-Map/blob/3d1ce839f39adb54306c8ee0e62be92fd392b206/packages/maps/src/tomtomTraffic.ts#L53)

Incydenty ruchu w prostokącie. `bbox`: `minLng,minLat,maxLng,maxLat`.
`iconCategory` 8 = zamknięcie → severity "closure".

#### Parameters

##### bbox

`string`

##### apiKey

`string`

##### opts?

###### language?

`string`

#### Returns

`Promise`\<[`TrafficIncident`](../api/maps/src.md#trafficincident)[]\>
