# GPC.EU UnitInputData — Parameter Reference

> **Quelle:** `UnitInputData_Documentation_2026.1.pdf` — Version GPC.EU Customer 2026.1-310
> **Generiert:** 2026-05-22T05:34:37.691Z  · 222 Properties
> **Erzeugt von:** `rag/build-gpc-parameters.js` aus `rag/gpc-parameters.json` — Markdown nicht von Hand editieren.

Dieses Dokument ist die kanonische, API-zentrische Referenz für das `UnitInputData`-Schema der **GPC.EU Customer API**. Pro Property: offizielle Beschreibung, Datentyp, Einheit, Group-Kategorie, vollständiger Enum-Werte-Set. Die UI-zentrische Sicht (welche Form-Felder welche Properties bedienen) liegt in `rag/gpc-field-mapping.md`.

## Inhalt — nach Group

- [Extras](#extras) — 4
- [Hydro](#hydro) — 17
- [Limitations](#limitations) — 11
- [Options](#options) — 14
- [Recalculation](#recalculation) — 6
- [Startpage](#startpage) — 3
- [Thermodynamics](#thermodynamics) — 39
- [UnitSelection](#unitselection) — 2
- [Unknown](#unknown) — 126

## Alphabetischer Index

| | | |
|---|---|---|
| [`AdjustableFlapWithDrive`](#adjustableflapwithdrive) | [`FinPitch0Max`](#finpitch0max) | [`NoOfDevices`](#noofdevices) |
| [`AirBlowOffType`](#airblowofftype) | [`FinPitch0Min`](#finpitch0min) | [`NoOfFans`](#nooffans) |
| [`AirDuct`](#airduct) | [`FinPitchVariableOnly`](#finpitchvariableonly) | [`NoOfPasses`](#noofpasses) |
| [`AirHoseConnection`](#airhoseconnection) | [`FinSpacingInputMode`](#finspacinginputmode) | [`NoOutletNipples`](#nooutletnipples) |
| [`AirHoseConnectionInclStreamer`](#airhoseconnectioninclstreamer) | [`FluidID`](#fluidid) | [`OnlyStockUnits`](#onlystockunits) |
| [`AirHumidityInputMode`](#airhumidityinputmode) | [`FluidID_2`](#fluidid-2) | [`OutletNippleOuterDiameter`](#outletnippleouterdiameter) |
| [`AirPressure`](#airpressure) | [`FluidInputMode`](#fluidinputmode) | [`OverpressureFlap`](#overpressureflap) |
| [`AirPressureInputMode`](#airpressureinputmode) | [`FluidMassFlow`](#fluidmassflow) | [`PadTypes_HydroPad`](#padtypes-hydropad) |
| [`AirRelHumidity`](#airrelhumidity) | [`FluidPressure`](#fluidpressure) | [`PassNumberConstraint`](#passnumberconstraint) |
| [`AirTemperature`](#airtemperature) | [`FluidPressureDropMax`](#fluidpressuredropmax) | [`PowerSupply`](#powersupply) |
| [`AirTemperatureMode`](#airtemperaturemode) | [`FluidPumpMode`](#fluidpumpmode) | [`PreSelection`](#preselection) |
| [`AirVelocityClass`](#airvelocityclass) | [`FluidPumpRate`](#fluidpumprate) | [`PressureSensor`](#pressuresensor) |
| [`AirWetBulbTemp`](#airwetbulbtemp) | [`FluidSubCooling`](#fluidsubcooling) | [`PreviousChangedValue`](#previouschangedvalue) |
| [`Altitude`](#altitude) | [`FluidSuperHeating`](#fluidsuperheating) | [`ProductCategory`](#productcategory) |
| [`AxitopFans`](#axitopfans) | [`FluidTempCond`](#fluidtempcond) | [`RalNumber`](#ralnumber) |
| [`Ball_Valve_Half_For_Ventilation`](#ball-valve-half-for-ventilation) | [`FluidTempCond_2`](#fluidtempcond-2) | [`ReducedLegs`](#reducedlegs) |
| [`BaseUnitFunction`](#baseunitfunction) | [`FluidTempEvap`](#fluidtempevap) | [`RepairSwitch`](#repairswitch) |
| [`BaseUnitID`](#baseunitid) | [`FluidTempInlet`](#fluidtempinlet) | [`RepairSwitchPosition`](#repairswitchposition) |
| [`BrineDefrostConcentration`](#brinedefrostconcentration) | [`FluidTempInlet_2`](#fluidtempinlet-2) | [`RepairSwitchType`](#repairswitchtype) |
| [`BrineDefrostFluid`](#brinedefrostfluid) | [`FluidTempOutlet`](#fluidtempoutlet) | [`RepairSwitchWiring`](#repairswitchwiring) |
| [`BrineDefrostPressuredrop`](#brinedefrostpressuredrop) | [`FluidVolConcentration`](#fluidvolconcentration) | [`SeparationSheetWithHeater`](#separationsheetwithheater) |
| [`CanvasSleeves`](#canvassleeves) | [`FluidVolumeFlow`](#fluidvolumeflow) | [`Shutup`](#shutup) |
| [`CapacitySensibleHeatOnly`](#capacitysensibleheatonly) | [`ForEnergySavingController`](#forenergysavingcontroller) | [`SoundAbsorber`](#soundabsorber) |
| [`CasingAndDoubleTray`](#casinganddoubletray) | [`ForNoiseUse`](#fornoiseuse) | [`SoundPressureDistance`](#soundpressuredistance) |
| [`CasingAndFullCoverageDoubleTraySS`](#casingandfullcoveragedoubletrayss) | [`FrostedCoil`](#frostedcoil) | [`SoundPressureMax`](#soundpressuremax) |
| [`CasingAndHygienicDoubleTraySS`](#casingandhygienicdoubletrayss) | [`FrostThickness`](#frostthickness) | [`SpecialVarnishing`](#specialvarnishing) |
| [`CasingAndSimplyTray`](#casingandsimplytray) | [`FullCoverageDoubleTrayInsulated`](#fullcoveragedoubletrayinsulated) | [`Subcooler`](#subcooler) |
| [`ClimaCoilOption`](#climacoiloption) | [`Geo_AirTemp_HydroPad`](#geo-airtemp-hydropad) | [`SubcriticAirRelHumidity`](#subcriticairrelhumidity) |
| [`ClimatizationCoil`](#climatizationcoil) | [`Geo_Altitude_HydroPad`](#geo-altitude-hydropad) | [`SubcriticAirTemperature`](#subcriticairtemperature) |
| [`Coil_Defender`](#coil-defender) | [`Geo_Length_HydroPad`](#geo-length-hydropad) | [`SubcriticAirWetBulbTemp`](#subcriticairwetbulbtemp) |
| [`CoilDefrostType`](#coildefrosttype) | [`Geo_MaxAirTemp_HydroPad`](#geo-maxairtemp-hydropad) | [`SubcriticFluidPressureDropMax`](#subcriticfluidpressuredropmax) |
| [`ConceptName`](#conceptname) | [`Geo_RelHumidity_HydroPad`](#geo-relhumidity-hydropad) | [`SubcriticFluidTempCond`](#subcriticfluidtempcond) |
| [`CondensatePump`](#condensatepump) | [`Geo_Search_HydroPad`](#geo-search-hydropad) | [`SubcriticFluidTempInlet`](#subcriticfluidtempinlet) |
| [`ConnectionAndBowCovering`](#connectionandbowcovering) | [`Geo_Width_HydroPad`](#geo-width-hydropad) | [`SubcriticIsHotGasAuto`](#subcriticishotgasauto) |
| [`ConnectionRoof`](#connectionroof) | [`GuentnerStreamer`](#guentnerstreamer) | [`SubcriticThermalCapacity`](#subcriticthermalcapacity) |
| [`ConnectionSystem`](#connectionsystem) | [`HBLKValve`](#hblkvalve) | [`SwitchCabinet`](#switchcabinet) |
| [`ConnectionType`](#connectiontype) | [`HeatingStrapsAtAirOutlet`](#heatingstrapsatairoutlet) | [`SwitchCabinetAllocation`](#switchcabinetallocation) |
| [`ContainerTransportRail`](#containertransportrail) | [`HingedFanPlate`](#hingedfanplate) | [`SwitchCabinetMotorTechnology`](#switchcabinetmotortechnology) |
| [`ControllerAllocation`](#controllerallocation) | [`HotGasInterConnectingTubing`](#hotgasinterconnectingtubing) | [`SwitchCabinetType`](#switchcabinettype) |
| [`ControllerByPassObligatory`](#controllerbypassobligatory) | [`HydroPad`](#hydropad) | [`SwivelingFans`](#swivelingfans) |
| [`ControllerInterface`](#controllerinterface) | [`InletHood`](#inlethood) | [`TC_Tolerance_H`](#tc-tolerance-h) |
| [`ControllerType`](#controllertype) | [`InletNippleOuterDiameter`](#inletnippleouterdiameter) | [`TC_Tolerance_L`](#tc-tolerance-l) |
| [`CoreTubeMaterial`](#coretubematerial) | [`InletPosLeft`](#inletposleft) | [`TCondInputMode`](#tcondinputmode) |
| [`CorrosionProtectionClass`](#corrosionprotectionclass) | [`InletPosRight`](#inletposright) | [`TelescopicLegs`](#telescopiclegs) |
| [`CountryID_HydroPad`](#countryid-hydropad) | [`InletStateByTempAndPressure`](#inletstatebytempandpressure) | [`TerminalBoxType`](#terminalboxtype) |
| [`DefaultIndoorVarnishing`](#defaultindoorvarnishing) | [`InputModeCapacity`](#inputmodecapacity) | [`ThermalCapacity`](#thermalcapacity) |
| [`DefaultOutdoorVarnishing`](#defaultoutdoorvarnishing) | [`InspectionCover`](#inspectioncover) | [`ThermalCapacity_2`](#thermalcapacity-2) |
| [`DefrostFlap`](#defrostflap) | [`IoTModule`](#iotmodule) | [`ThermoContactType`](#thermocontacttype) |
| [`Defrosting`](#defrosting) | [`IsAirRelHumidityAuto`](#isairrelhumidityauto) | [`ThermosiphonOilCooling`](#thermosiphonoilcooling) |
| [`DefrostingHotGasFeed`](#defrostinghotgasfeed) | [`IsContainerTransport`](#iscontainertransport) | [`ThreadConnectionMaterial`](#threadconnectionmaterial) |
| [`DefrostingUserDefined`](#defrostinguserdefined) | [`IsHotGasAuto`](#ishotgasauto) | [`Tubing_Of_Integrated_Subcooler_With_Syphon`](#tubing-of-integrated-subcooler-with-syphon) |
| [`DeliveryTimeFilter`](#deliverytimefilter) | [`IsMaxFluidPressureDropAuto`](#ismaxfluidpressuredropauto) | [`UnitFilterList`](#unitfilterlist) |
| [`DoubleFanPlates`](#doublefanplates) | [`isSubcritic`](#issubcritic) | [`UnitHeightMax`](#unitheightmax) |
| [`DoubleTrayInsulated`](#doubletrayinsulated) | [`IsSubcriticMaxFluidPressureDropAuto`](#issubcriticmaxfluidpressuredropauto) | [`UnitLengthMax`](#unitlengthmax) |
| [`ECFanOption`](#ecfanoption) | [`isSupercritic`](#issupercritic) | [`UnitModelID_MRNameExternal`](#unitmodelid-mrnameexternal) |
| [`ECJunctionBoxWithMainSwitch`](#ecjunctionboxwithmainswitch) | [`LastChangedKey`](#lastchangedkey) | [`UnitModelID_MRNameInternal`](#unitmodelid-mrnameinternal) |
| [`EfficiencyClass`](#efficiencyclass) | [`LocationID_HydroPad`](#locationid-hydropad) | [`UnitModelID_MTNameExternal`](#unitmodelid-mtnameexternal) |
| [`EmptyCasing`](#emptycasing) | [`LowEvapTempDesign`](#lowevaptempdesign) | [`UnitModelID_MTNameInternal`](#unitmodelid-mtnameinternal) |
| [`EmptyCasingBottomSheet`](#emptycasingbottomsheet) | [`ManualSpeedController`](#manualspeedcontroller) | [`Units`](#units) |
| [`EmptyCasingHeight`](#emptycasingheight) | [`Market`](#market) | [`UnitSelectionMode`](#unitselectionmode) |
| [`EmptyCasingIsolation`](#emptycasingisolation) | [`MaxNumberOfHits`](#maxnumberofhits) | [`UnitWidthMax`](#unitwidthmax) |
| [`EmptyCasingLength`](#emptycasinglength) | [`MaxOperatingPressure`](#maxoperatingpressure) | [`UVC_Lamp`](#uvc-lamp) |
| [`EnableForMounting`](#enableformounting) | [`MaxSoundInputMode`](#maxsoundinputmode) | [`VersionNumber`](#versionnumber) |
| [`Epoxy_Fins`](#epoxy-fins) | [`MaxSoundTolerance`](#maxsoundtolerance) | [`VibrationDampers`](#vibrationdampers) |
| [`ErP_Compliant`](#erp-compliant) | [`MiniumRequiredSubcooling`](#miniumrequiredsubcooling) | [`WallSuspension`](#wallsuspension) |
| [`ESPMax`](#espmax) | [`MotorTechnology`](#motortechnology) | [`WaterConsumptionCalculation_HydroPad`](#waterconsumptioncalculation-hydropad) |
| [`ESPMin`](#espmin) | [`MountedAndWired`](#mountedandwired) | [`WaterConsumptionCalculation_Mode_HydroPad`](#waterconsumptioncalculation-mode-hydropad) |
| [`EspMinMaxDescription`](#espminmaxdescription) | [`MountedLegs`](#mountedlegs) | [`WaterConsumptionCalculation_SwitchPoint_HydroPad`](#waterconsumptioncalculation-switchpoint-hydropad) |
| [`ExhaustDuct`](#exhaustduct) | [`MountedLegsGS`](#mountedlegsgs) | [`WaterConsumptionCalculation_WettingDuration_HydroPad`](#waterconsumptioncalculation-wettingduration-hydropad) |
| [`ExtendedLegs`](#extendedlegs) | [`MountedLegsSS`](#mountedlegsss) | [`Watering_HydroPad`](#watering-hydropad) |
| [`ExternalPressing`](#externalpressing) | [`MultipleCircuits`](#multiplecircuits) | [`WateringRate_HydroPad`](#wateringrate-hydropad) |
| [`FanFuseSpec`](#fanfusespec) | [`NippleTubeMaterial`](#nippletubematerial) | [`WeldingNeckFlangeNominalPressure`](#weldingneckflangenominalpressure) |
| [`FanRingHeater`](#fanringheater) | [`NoInletNipples`](#noinletnipples) | [`Wiring_To_Junction_Box_At_Side`](#wiring-to-junction-box-at-side) |
| [`FinConinID`](#finconinid) | [`NoOfCircuitsThermo`](#noofcircuitsthermo) | [`Wiring_To_Terminal_Box`](#wiring-to-terminal-box) |

---

## Extras

### `IsSubcriticMaxFluidPressureDropAuto`

**#128** · Type: `Boolean` · Unit: — · Group: `Extras`

The max fluid pressre drop can be defined automatically.

| Value | Description |
|---|---|
| `FALSE` | Indicates that the user must define the threshold. |
| `TRUE` | Indicates that Güntner decides for a fitting value. |

### `PassNumberConstraint`

**#157** · Type: `Int32` · Unit: — · Group: `Extras`

Constraints for the number of passes

| Value | Description |
|---|---|
| `0` | All numbers between nNumberOfPassesMin and nNumberOfPassesMax |
| `1` | Only even number of passes between nNumberOfPassesMin and nNumberOfPassesMax |
| `2` | Discrete values must be given in DiscreteNumberOfPasses |

### `TC_Tolerance_H`

**#189** · Type: `Double` · Unit: `Percent` · Group: `Extras`

This parameters specifies the upper limit for the surface reserve tolerance.

### `TC_Tolerance_L`

**#190** · Type: `Double` · Unit: `Percent` · Group: `Extras`

This parameters specifies the lower limit for the surface reserve tolerance.

---

## Hydro

### `CountryID_HydroPad`

**#45** · Type: `Int32` · Unit: — · Group: `Hydro`

Defines for which country, specified via an ID, the option hydroBLU, known also as HydroPad or evaporative cooling pad, (or the option hydroSPRAY???) the thermodynamics should be calculated, if it is selected.

### `Geo_AirTemp_HydroPad`

**#102** · Type: `Double` · Unit: `Degree_C` · Group: `Hydro`

Air temperature from the selected location. Only relevant if HydroPad is selected.

### `Geo_Altitude_HydroPad`

**#103** · Type: `Double` · Unit: `m` · Group: `Hydro`

Defines the height above sea level = geodetic height/altitude from the selected location.

### `Geo_Length_HydroPad`

**#104** · Type: `Double` · Unit: `DMS` · Group: `Hydro`

Longitude coordinates from the selected location.

### `Geo_MaxAirTemp_HydroPad`

**#105** · Type: `Double` · Unit: `m` · Group: `Hydro`

Defines the maximum air temperature from the selected location. Only relevant if HydroPad is selected.

### `Geo_RelHumidity_HydroPad`

**#106** · Type: `Double` · Unit: `Percent` · Group: `Hydro`

Defines the relative air humidity at the inlet from the selected location.

### `Geo_Search_HydroPad`

**#107** · Type: `Boolean` · Unit: — · Group: `Hydro`

Flag, if nearest location to custom coordinates should be searched.

### `Geo_Width_HydroPad`

**#108** · Type: `Double` · Unit: `DMS` · Group: `Hydro`

Latitude coordinates from the selected location.

### `HydroPad`

**#114** · Type: `Int32` · Unit: — · Group: `Hydro`

Indicates whether hydroBLU is required as an accessory.

| Value | Description |
|---|---|
| `234` | hydroBLU is required as an accessory |

### `LocationID_HydroPad`

**#131** · Type: `Int32` · Unit: — · Group: `Hydro`

The ID of the place to use for Hydropad calculation

### `PadTypes_HydroPad`

**#156** · Type: `Int32` · Unit: — · Group: `Hydro`

Specifies Pad Type ID.

### `WaterConsumptionCalculation_HydroPad`

**#214** · Type: `Boolean` · Unit: — · Group: `Hydro`

The parameter defines whether or not a water consumption calculation is required to be perfumed for the unit selected, and output to the data sheet

| Value | Description |
|---|---|
| `0` | Indicates that the water consumption calculation should not be performed |
| `1` | Indicates that the water consumption calculation should be performed |

### `WaterConsumptionCalculation_Mode_HydroPad`

**#215** · Type: `Int32` · Unit: — · Group: `Hydro`

This parameter defines the way the water consumption calculation should be performed for units with the HydroSpray option, if the water calculation is requested.

| Value | Description |
|---|---|
| `0` | The wetting duration is set, and the switch point is then calculated (this is the default setting for the calculation mode) |
| `1` | The switch point is set, and the wetting duration is then calculated |

### `WaterConsumptionCalculation_SwitchPoint_HydroPad`

**#216** · Type: `Double` · Unit: — · Group: `Hydro`

If the water calculation mode for a unit with a hydroSpray option is set to calculation of the wetting duration with a set switch point, this parameter sets the wetting duration to be used.

### `WaterConsumptionCalculation_WettingDuration_HydroPad`

**#217** · Type: `Double` · Unit: — · Group: `Hydro`

If the water calculation mode for a unit with a hydroSpray option is set to calculation of the switch point with a set wetting duration, this parameter sets the wetting duration to be used.

### `Watering_HydroPad`

**#218** · Type: `Int32` · Unit: — · Group: `Hydro`

For a unit with the hydroBLU option selected, this parameter defines the opretation mode for the watering system:

| Value | Description |
|---|---|
| `0` | The unit is operating in wet mode, with pads installed and water fed to the pads |
| `1` | The unit is operating dry (no water fed for the pads), but with the pads installed on the unit |
| `2` | The unit is operating dry with the pads uninstalled on the unit |

### `WateringRate_HydroPad`

**#219** · Type: `Double` · Unit: — · Group: `Hydro`

This parameter sets the watering rate for the hydroBLU system. The available values are 1.2, 1.6, 2.0 and 2.8 (default of 2.)

---

## Limitations

### `DeliveryTimeFilter`

**#52** · Type: `Int32` · Unit: `WorkDays` · Group: `Limitations`

Defines the delivery time filter type

| Value | Description |
|---|---|
| `-1` | Only available units |
| `-2` | Only units that are in stock |
| `0` | No filter defined |
| `1` | Unit shippd within 1 business day |
| `2` | Unit shippd within 2 business days |
| `3` | Unit shippd within 3 business days |
| `4` | Unit shippd within 4 business days |
| `5` | Unit shippd within 5 business days |
| `6` | Unit shippd within 6 business days |

### `IsContainerTransport`

**#124** · Type: `Boolean` · Unit: — · Group: `Limitations`

Transport from the unit in a container.

| Value | Description |
|---|---|
| `FALSE` | Indicates no transport preference. |
| `TRUE` | Indicates that the device is to be transported in a container. |

### `MaxSoundInputMode`

**#137** · Type: `Int32` · Unit: — · Group: `Limitations`

Selects the mode the sound is filtered.

### `NoOfDevices`

**#149** · Type: `Int32` · Unit: — · Group: `Limitations`

Number of required units.

### `NoOfFans`

**#150** · Type: `Int32` · Unit: — · Group: `Limitations`

Number of required fans.

### `OnlyStockUnits`

**#153** · Type: `Boolean` · Unit: — · Group: `Limitations`

Only products that are ready to ship.

### `SoundPressureDistance`

**#172** · Type: `Double` · Unit: `m` · Group: `Limitations` · ProductCategory: `4`, `6`

Distance for which the sound pressure level is to be calculated [m]. Only relevant if - ProductCategory = 4 to 6 (condenser, drycooler or subcooler) - For ProductCatetory 1 to 3 (evaporator and refrigerant air cooler), this input parameter is ignored and set internally to 3 m - Distance specification according to enveloping surface method EN 13487, i.e. distance between appliance and the enveloping surface that is placed around the appliance. - Value range: >= 0 m

### `SoundPressureMax`

**#173** · Type: `Double` · Unit: `dBA` · Group: `Limitations`

Only relevant if - UnitSelectionMode = 0 ('unit search mode'). - The limit value applies to a distance corresponding to SoundPressureDistance. - The sound pressure level is calculated using the enveloping surface method in accordance with EN 13487. - If the sound pressure level is not to be limited, it is advisable to specify a high value(e.g. 99.0 dB(A)). In the selection program, the specified maximum sound pressure level is eventually increased internally by an additional 4 dB(A) tolerance.

| Value | Description |
|---|---|
| `0` | Max. sound power |
| `1` | Max. sound pressure |

### `UnitHeightMax`

**#201** · Type: `Double` · Unit: `m` · Group: `Limitations`

This parameters sets the maximum height in meters that should be considered for the units returned during a unit search.

### `UnitLengthMax`

**#202** · Type: `Double` · Unit: `m` · Group: `Limitations`

This parameters sets the maximum length in meters that should be considered for the units returned during a unit search.

| Value | Description |
|---|---|
| `0` | no constraint |
| `68` | high-strength copper (D) |
| `87` | stainl. steel (W) |

### `UnitWidthMax`

**#209** · Type: `Double` · Unit: `m` · Group: `Limitations`

This parameters sets the maximum width in meters that should be considered for the units returned during a unit search.

---

## Options

### `AdjustableFlapWithDrive`

**#1** · Type: `Int32` · Unit: — · Group: `Options`

Indicates whether a louvre, also known as a defrost flap made of galvanized steel and with drive is required as an accessory.

| Value | Description |
|---|---|
| `0` | Indicates that the louvre is not necessarily needed. |
| `1` | Indicates that the louvre is definitely needed. |

### `AirBlowOffType`

**#2** · Type: `Int32` · Unit: — · Group: `Options`

Specifies the air blow direction (only relevant for Downblow Accessory)

| Value | Description |
|---|---|
| `0` | no restrictions |
| `1` | vertically up |
| `2` | horizontally |
| `345` | ° down |
| `4` | vertically down |

### `AirDuct`

**#3** · Type: `Int32` · Unit: — · Group: `Options`

Indicates whether an air duct is required as an accessory.

| Value | Description |
|---|---|
| `0` | Indicates that the air duct is not necessarily needed. |
| `1` | Indicates that the air duct is definitely needed. |

### `AirHoseConnection`

**#4** · Type: `Int32` · Unit: — · Group: `Options`

Indicates whether a air sock connection without Güntner Streamer is required as an accessory.

| Value | Description |
|---|---|
| `0` | Indicates that the air sock connection is not necessarily needed. |
| `1` | Indicates that the air sock connection is definitely needed. |

### `AirHoseConnectionInclStreamer`

**#5** · Type: `Int32` · Unit: — · Group: `Options`

Indicates whether a air sock connection with Güntner Streamer is required as an accessory.

| Value | Description |
|---|---|
| `0` | Indicates that the air sock connection is not necessarily needed. |
| `1` | Indicates that the air sock connection is definitely needed. |

### `AirVelocityClass`

**#12** · Type: `Int32` · Unit: — · Group: `Options` · ProductCategory: `0`, `1`, `2`

Defines the air velocity class (only relevant if UnitSelectionMode = 0 (unit search mode) and ProductCategory = 0,1,2 (evaporator or aircooler (brine)).

| Value | Description |
|---|---|
| `0` | no restrictions (mapped to AIR_VELOCITY_CLASS_ALL) |
| `1` | standard air velocity |
| `2` | high air velocity (only suitable for low temperatures) |
| `3` | low air velocity (e.g. used for processing rooms) |

### `Ball_Valve_Half_For_Ventilation`

**#16** · Type: `Int32` · Unit: — · Group: `Options`

Indicates whether a ball valve 1/2” for ventilation/drain is required as an accessory.

| Value | Description |
|---|---|
| `0` | Indicates that the ball valve is not necessarily needed. |
| `1` | Indicates that the ball valve is definitely needed. |

### `ESPMax`

**#66** · Type: `Double` · Unit: `Pa` · Group: `Options`

Upper limit for external static pressure. (Used in GPC.AM.)

### `ESPMin`

**#67** · Type: `Double` · Unit: `Pa` · Group: `Options`

Lower limit for external static pressure. (Used in GPC.AM.)

### `EspMinMaxDescription`

**#68** · Type: `String` · Unit: — · Group: `Options`

String that can describe the lower and upper limit for external static pressure. (Used in GPC.AM.)

### `ExternalPressing`

**#71** · Type: `Double` · Unit: `Pa` · Group: `Options`

External static pressing (ESP) for standard fans (only for KDB units).

### `MotorTechnology`

**#140** · Type: `Int32` · Unit: — · Group: `Options`

This parameter defines the fan motor technology, or fan motor type of the unit.

| Value | Description |
|---|---|
| `-1` | All fan motor technologies are considered |
| `-2` | The fan motor technology is energy optimized |
| `-3` | The fan motor technology is cost optimized |
| `1` | The motor technology is AC |
| `2` | The motor technology is EC (electronically commutated) |

### `NippleTubeMaterial`

**#146** · Type: `Int32` · Unit: — · Group: `Options`

Indicates whether a different material should be used for NippleTube

### `PowerSupply`

**#158** · Type: `Int32` · Unit: — · Group: `Options`

Specification of the voltage supply network for which the unit should be suitable.

| Value | Description |
|---|---|
| `0` | no constraint |
| `3` | 115V 1~ 60Hz |
| `4` | 208-230V 1~ 60Hz |
| `5` | 208-230V 3~ 60Hz |
| `6` | 230V 1~ 50Hz |
| `7` | 380V 1~ 50Hz |
| `8` | 380V 3~ 60Hz |
| `9` | 400V 3~ 50Hz |
| `10` | 400V 3~ 60Hz |
| `11` | 460V 1~ 60Hz |
| `12` | 460V 3~ 60Hz |
| `13` | 575V 3~ 60Hz |
| `14` | 230V 3~ 50Hz |
| `15` | 230V 3~ 60Hz |
| `16` | 230V 1~ 60Hz |
| `18` | 110V 1~ 50Hz |
| `19` | 110V 1~ 60Hz |

---

## Recalculation

### `BaseUnitID`

**#18** · Type: `Int64` · Unit: — · Group: `Recalculation`

Defines the BaseUnitID, which is needed only for the recalculation of KDB units (UnitSelectionMode = 1 = recalculation of existing unit). Has to be taken from the output of a given selection.

### `ConceptName`

**#32** · Type: `String` · Unit: — · Group: `Recalculation`

Defines the ConceptName of the unit, which is needed for the recalculation of KDB units (UnitSelectionMode = 1 = recalculation of existing unit). Has to be taken from the output of a given selection.

### `UnitModelID_MRNameExternal`

**#203** · Type: `String` · Unit: — · Group: `Recalculation`

For recalculation (KDB): Model type name external.

### `UnitModelID_MRNameInternal`

**#204** · Type: `String` · Unit: — · Group: `Recalculation`

For recalculation (TDB): Model range name internal.

### `UnitModelID_MTNameExternal`

**#205** · Type: `String` · Unit: — · Group: `Recalculation`

For recalculation (TDB): Model type name external.

### `UnitModelID_MTNameInternal`

**#206** · Type: `String` · Unit: — · Group: `Recalculation`

For recalculation (TDB): Model type name internal.

---

## Startpage

### `BaseUnitFunction`

**#17** · Type: `Int32` · Unit: — · Group: `Startpage`

Defines the needed product category

| Value | Description |
|---|---|
| `0` | DX evaporator (Cold Indoor) |
| `1` | Flooded evaporator (Cold Indoor) |
| `10` | DX evaporator heat collector (Heat Collectors, Outdoor) |
| `2` | Flooded evaporator (Cold Indoor) |
| `3` | Condenser (Warm Outdoor) |
| `4` | Brine cooler (Warm Outdoor) |
| `5` | Sub cooler (Warm Outdoor) |
| `6` | Oil cooler (Warm Outdoor) |
| `7` | Gas cooler (Warm Outdoor) |
| `8` | One phase air cooler heat collector (Heat Collectors, Outdoor) |
| `9` | Flooded evaporator heat collector (Heat Collectors, Outdoor) |

### `Market`

**#134** · Type: `Int32` · Unit: — · Group: `Startpage`

Selects the market the device will be delivered to

| Value | Description |
|---|---|
| `101` | Europa (EU) |
| `201` | Asia, Pacific and Oceania (APO) |
| `401` | North and Latin America (NLA) |

### `ProductCategory`

**#162** · Type: `Int32` · Unit: — · Group: `Startpage`

Defines the product category

| Value | Description |
|---|---|
| `0` | DX evaporator (Cold Indoor) |
| `1` | Flooded evaporator (Cold Indoor) |
| `10` | Gas Cooler |
| `2` | One phase air cooler (Cold Indoor) |
| `3` | Condenser (Warm Outdoor) |
| `4` | Brine cooler (Warm Outdoor) |
| `5` | Sub cooler (Warm Outdoor) |
| `6` | Oil cooler (Warm Outdoor) |

---

## Thermodynamics

### `AirHumidityInputMode`

**#6** · Type: `Int32` · Unit: — · Group: `Thermodynamics`

Defines the input mode for the air humidity.

| Value | Description |
|---|---|
| `0` | MODE_AUTO Relative humidity will be calculated automatically |
| `1` | MODE_REL_HUMIDITY AirRelHumidity must be set |
| `2` | MODE_WET_BULB_TEMP AirWetBulbTemp must be set |

### `AirPressure`

**#7** · Type: `Double` · Unit: `mbar` · Group: `Thermodynamics`

Defines the air pressure at the inlet.

### `AirPressureInputMode`

**#8** · Type: `Int32` · Unit: — · Group: `Thermodynamics`

Defines the input mode for the air pressure. Accordingly, either the AirPressure or Altitude input parameter is relevant/used.

| Value | Description |
|---|---|
| `0` | to define the air pressure itself |
| `1` | to define the geodetic height/altitude = height above sea level |

### `AirRelHumidity`

**#9** · Type: `Double` · Unit: `Percent` · Group: `Thermodynamics`

Defines the relative air humidity at the inlet.

### `AirTemperature`

**#10** · Type: `Double` · Unit: `Degree_C` · Group: `Thermodynamics`

Defines the air temperature. Which air temperature (inlet, room as average between inlet/outlet, room as LMTD) is defined, depends on the AirTemperatureMode.

### `AirTemperatureMode`

**#11** · Type: `Int32` · Unit: — · Group: `Thermodynamics`

Defines the input mode for the air temperature.

| Value | Description |
|---|---|
| `0` | to define the air inlet temperature. |
| `1` | to define the room temperature of the air as mean value between inlet and outlet |
| `2` | to define the room temperature of the air as LMTD, with room temperature (LMTD) = t_0 + LMTD (was only temporarily allowed for |
| `P` | roductCategory 1 for Guntner America and until April 2010) [???] |

### `AirWetBulbTemp`

**#13** · Type: `Double` · Unit: `Degree_C` · Group: `Thermodynamics`

Defines the wet bulb temperature = lowest temperature that can be achieved by evaporation

### `Altitude`

**#14** · Type: `Double` · Unit: `m` · Group: `Thermodynamics`

Defines the height above sea level = geodetic height/altitude.

### `CapacitySensibleHeatOnly`

**#23** · Type: `Boolean` · Unit: — · Group: `Thermodynamics`

Additional flag for the thermal capacity, whether it defines only the sensible heat. Used only for America. Sensible heat refers to the thermal energy that is added to or removed from a system without a phase transition taking place. It is the heat that directly influences the temperature of a substance without changing its physical state. The formula ""Sensible heat = total power - heat of condensation"" shows how to calculate sensible heat by subtracting the total power of a system from the heat of condensation.

| Value | Description |
|---|---|
| `FALSE` | ThermalCapacity defines the completely needed thermal capacity. |
| `TRUE` | ThermalCapacity defines the sensible heat only. |

### `FluidID`

**#79** · Type: `Int32` · Unit: — · Group: `Thermodynamics`

Defines the ID number of the fluid, that is used in the heat exchanger's main or first circuit.

### `FluidID_2`

**#80** · Type: `Int32` · Unit: — · Group: `Thermodynamics`

Defines the ID number of the fluid, that is used in the heat exchanger's second circuit when multiple circuits option is selected.

### `FluidInputMode`

**#81** · Type: `Int32` · Unit: — · Group: `Thermodynamics` · ProductCategory: `3`, `5`, `6`

Defines the input modes for the fluid that says, which input values for the fluid must be set. This value is needed when ProductCategory is 3, 5 or 6 (air cooler for coolant, fluid cooler, sub cooler). For ProductCategory 6 (sub cooler), only FluidInputMode 0 is allowed.

| Value | Description |
|---|---|
| `0` | FluidTempInlet and FluidTempOutlet must be set |
| `1` | FluidTempInlet and FluidVolumeFlow must be set |
| `2` | FluidTempOutlet and FluidVolumeFlow must be set |
| `3` | FluidTempInlet and FluidPressureDropMax must be set |
| `4` | FluidTempOutlet and FluidPressureDropMax must be set |
| `5` | FluidTempInlet and FluidMassFlow must be set |
| `6` | FluidTempOutlet and FluidMassFlow must be set |

### `FluidMassFlow`

**#82** · Type: `Double` · Unit: `kg_per_h` · Group: `Thermodynamics`

Defines the mass flow of the fluid. This value is needed, when FluidInputMode is 5 (FluidTempInlet and FluidMassFlow) or 6 (FluidTempOutlet and FluidVolumeFlow)

### `FluidPressure`

**#83** · Type: `Double` · Unit: `mbar` · Group: `Thermodynamics` · ProductCategory: `0`

Defines the pressure of the fluid. This value is needed for ProductCategory 0 (DX evaporator) or 10 (gas cooler).

### `FluidPressureDropMax`

**#84** · Type: `Double` · Unit: `K_TD` · Group: `Thermodynamics` · ProductCategory: `3`, `5`, `6`

Defines the maximum allowed pressure drop of the fluid inside the heat exchanger. This value is considered for ProductCategory 3, 5 or 6 (air cooler for coolant, fluid cooler, sub cooler). For other product categories a valid value will be set internally. For other product categories a valid value will be set internally.

### `FluidPumpMode`

**#85** · Type: `Int32` · Unit: — · Group: `Thermodynamics` · ProductCategory: `1`

Defines, how the fluid is pumped through the flooded evaporator. Depending on the mode, different internal limit values are set, in particular the maximum pressure drop in the fluid. This value is needed for ProductCategory 1 (flooded evaporator).

| Value | Description |
|---|---|
| `0` | Fluid circulation by a pump |
| `1` | Fluid circulation by gravity or natural circulation |

### `FluidPumpRate`

**#86** · Type: `Double` · Unit: — · Group: `Thermodynamics` · ProductCategory: `1`

Defines how often a fluid part must pass through the evaporator until it is completely evaporated. This value is needed for ProductCategory 1 (flooded evaporator).

### `FluidSubCooling`

**#87** · Type: `Double` · Unit: `K_TD` · Group: `Thermodynamics` · ProductCategory: `3`

Subcooling of the fluid after condensation. Specification relative to the condensation temperature at the end of the condensation process. Note: If the fluid has a temperature glide or a pressure loss occurs during condensation, the condensation temperature at the end of the condensation process is lower than FluidTempCond. If ProductCategory = 3 (condenser), a fixed subcooling of 1 K is assumed internally. Rule: The resulting subcooling temperature must not be lower than the evaporation temperature.

### `FluidSuperHeating`

**#88** · Type: `Double` · Unit: `K_TD` · Group: `Thermodynamics`

Superheating of the fluid after evaporation. Specification relative to the evaporation temperature FluidTempEvap.

### `FluidTempCond`

**#89** · Type: `Double` · Unit: `Degree_C` · Group: `Thermodynamics`

Fluid condensation temperature at the inlet or in the middle of the first fluid circuit.

### `FluidTempCond_2`

**#90** · Type: `Double` · Unit: `Degree_C` · Group: `Thermodynamics`

Fluid condensation temperature at the inlet or in the middle of the second fluid circuit.

### `FluidTempEvap`

**#91** · Type: `Double` · Unit: `Degree_C` · Group: `Thermodynamics`

Fluid evaporation temperature at the inlet or in the middle. The dew popublic int must be specified for fluids with temperature glide.

### `FluidTempInlet`

**#92** · Type: `Double` · Unit: `Degree_C` · Group: `Thermodynamics` · ProductCategory: `2`, `3`, `4`, `5`

Fluid temperature at inlet of the first circuit. If ProductCategory = 2, 4 or 5 (refrigerant air cooler, dry cooler, subcooler) and FluidInputMode = 0 or 1. If ProductCategory = 3 (condenser), the following must apply: Hot gas temperature >= condensing temperature. Specifies the hot gas temperature for condensers. Rule: The following must apply: FluidTempInlet >= -40.0 °C if it is used (FluidInputMode = 0 or 1).

### `FluidTempInlet_2`

**#93** · Type: `Double` · Unit: `Degree_C` · Group: `Thermodynamics` · ProductCategory: `2`, `3`, `4`, `5`

Fluid temperature at inlet of the second circuit. If ProductCategory = 2, 4 or 5 (refrigerant air cooler, dry cooler, subcooler) and FluidInputMode = 0 or 1. If ProductCategory = 3 (condenser), the following must apply: Hot gas temperature >= condensing temperature. Specifies the hot gas temperature for condensers. Rule: The following must apply: FluidTempInlet >= -40.0 °C if it is used (FluidInputMode = 0 or 1).

### `FluidTempOutlet`

**#94** · Type: `Double` · Unit: `Degree_C` · Group: `Thermodynamics` · ProductCategory: `3`, `5`, `6`

Fluid temperature at outlet. Rule for ProductCategory = 3 = refrigerant air cooler: The following must apply: FluidTempOutlet > FluidTempInlet if both are specified (FluidInputMode = 0). Rule for ProductCategory = 5/6 = drycooler/subcooler:The following must apply: FluidTempOutlet < FluidTempInlet,if both are specified (FluidInputMode = 0). Rule: The following must apply: FluidTempOutlet >= -40.0 °C if it is used (FluidInputMode = 0 or 2).

### `FluidVolConcentration`

**#95** · Type: `Double` · Unit: `VolPercent` · Group: `Thermodynamics`

Concentration of the fluid in volume-%. Only relevant if fluid allows a fluid concentration specification.

### `FluidVolumeFlow`

**#96** · Type: `Double` · Unit: `m3_per_h` · Group: `Thermodynamics`

Volume flow of the fluid. Only relevant if FluidInputMode = 1 or 2.

### `FrostedCoil`

**#99** · Type: `Boolean` · Unit: — · Group: `Thermodynamics`

Flag for frost on the block with 0.01 in as the default value for the frost thickness. Only in GPC.AM!

### `FrostThickness`

**#100** · Type: `Double` · Unit: `m` · Group: `Thermodynamics`

Thickness of the frost layer to be considered in meters. Values greater than 0.0 are only permissible for evaporators and air coolers.

### `InletStateByTempAndPressure`

**#119** · Type: `Boolean` · Unit: — · Group: `Thermodynamics`

Only relevant for CX evaporators! Normally, the pressure is calculated via the condensation temperature and subcooling. However, if you are in the supercritical range, this flag must be set! The inlet temperature and pressure must then be specified.

### `IsAirRelHumidityAuto`

**#123** · Type: `Boolean` · Unit: — · Group: `Thermodynamics`

Flag, if the relative air humidity at the inlet should be set automatically. Only available in GPC.AM.

### `IsHotGasAuto`

**#125** · Type: `Boolean` · Unit: — · Group: `Thermodynamics`

Flag, if hot gas temperature should be set automatically. Only relevant for condensers.

### `IsMaxFluidPressureDropAuto`

**#126** · Type: `Boolean` · Unit: — · Group: `Thermodynamics`

Flag, if max. fluid pressure drop should be set automatically.

### `isSubcritic`

**#127** · Type: `Boolean` · Unit: — · Group: `Thermodynamics`

Subcritical CO2 gas coolers operate below the critical point of carbon dioxide, where CO2 exists in a two-phase state as both a liquid and a gas. In these systems, CO2 gas is condensed into a liquid state through heat exchange with a cooler medium, such as air or water. This process relies on the properties of CO2 as it undergoes phase change, transitioning from a gas to a liquid.

| Value | Description |
|---|---|
| `FALSE` | Indicates that the unit will not operate in subcritical mode. |
| `TRUE` | Indicates that the unit will operate in subcritical mode. |

### `isSupercritic`

**#129** · Type: `Boolean` · Unit: — · Group: `Thermodynamics`

Supercritical CO2 gas coolers, on the other hand, operate above the critical point of carbon dioxide. In this state, CO2 behaves as a supercritical fluid, exhibiting properties of both a gas and a liquid. These coolers utilize the unique properties of supercritical CO2 to achieve efficient heat transfer, particularly in applications where high pressures and temperatures are involved. The cooling process involves heat exchange to transition the supercritical CO2 fluid into a subcritical state, where it exhibits more conventional refrigeration behavior.

| Value | Description |
|---|---|
| `FALSE` | Indicates that the unit will not operate in supercritical mode. |
| `TRUE` | Indicates that the unit will operate in supercritical mode. |

### `SubcriticThermalCapacity`

**#183** · Type: `Double` · Unit: `W` · Group: `Thermodynamics`

This parameter defines the target subcritical capacity in W for CO2 gas coolers.

### `ThermalCapacity`

**#194** · Type: `Double` · Unit: `W` · Group: `Thermodynamics`

This parameters sets the target thermal capacity, in W, for the main circuit of the heat exchanger.

### `ThermalCapacity_2`

**#195** · Type: `Double` · Unit: `W` · Group: `Thermodynamics`

This parameters sets the target thermal capacity, in W, for the secondary circuit of the heat exchanger.

### `ThermosiphonOilCooling`

**#197** · Type: `Int32` · Unit: — · Group: `Thermodynamics`

Only available for NH3 condenser. This checkbox has an effect on the max. pressure drop in coil.

| Value | Description |
|---|---|
| `0` | AUTO max. pressure drop in coil equals 5.0 K. |
| `1` | AUTO max. pressure drop in coil equals 0.3 K. |

---

## UnitSelection

### `Units`

**#207** · Type: `List`1` · Unit: — · Group: `UnitSelection`

Specification of the model ranges.

### `UnitSelectionMode`

**#208** · Type: `Int32` · Unit: — · Group: `UnitSelection`

Selection mode of the unit calculation.

| Value | Description |
|---|---|
| `0` | unit search |
| `1` | recalculation of a defined individual unit { get; set; } some other parameters are then ignored |

---

## Unknown

> Die Group **Unknown** sammelt Properties, die im offiziellen Dokumentations-Tool nicht gruppiert wurden — die meisten sind **Accessory-Flags** (0/1) oder **Controller-/SwitchCabinet-Sub-Properties**. Sie sind also nicht „unwichtig", nur uneinheitlich gepflegt.

### `AxitopFans`

**#15** · Type: `Int32` · Unit: — · Group: `Unknown`

Indicates whether a diffuser for the fans, also known as a Axitop, is required as an accessory.

| Value | Description |
|---|---|
| `0` | Indicates that the diffuser is not necessarily needed. |
| `1` | Indicates that the diffuser is definitely needed. |

### `BrineDefrostConcentration`

**#19** · Type: `Double` · Unit: `VolPercent` · Group: `Unknown`

Defines the concentration of the warm brine defrost fluid.

### `BrineDefrostFluid`

**#20** · Type: `Int32` · Unit: — · Group: `Unknown`

Defines the fluid used for the warm brine defrost accessory. Relevant only, if accessory “warm brine defrost” is selected.

### `BrineDefrostPressuredrop`

**#21** · Type: `Double` · Unit: `bar` · Group: `Unknown`

Defines the pressure drop of the warm brine defrost fluid. Relevant only, if accessory “warm brine defrost” is selected.

### `CanvasSleeves`

**#22** · Type: `Int32` · Unit: — · Group: `Unknown`

Indicates whether canvas sleeves are required as an accessory.

| Value | Description |
|---|---|
| `0` | Indicates that the canvas sleeves are not necessarily needed. |
| `1` | Indicates that the canvas sleeves are definitely needed. |

### `CasingAndDoubleTray`

**#24** · Type: `Int32` · Unit: — · Group: `Unknown`

Indicates whether a casing and a double tray made of stainless steel are required as an accessory.

| Value | Description |
|---|---|
| `0` | Indicates that they are not necessarily needed. |
| `1` | Indicates that they are definitely needed. |

### `CasingAndFullCoverageDoubleTraySS`

**#25** · Type: `Int32` · Unit: — · Group: `Unknown`

Indicates whether a casing and a full coverage double tray made of stainless steel are required as an accessory.

| Value | Description |
|---|---|
| `0` | Indicates that they are not necessarily needed. |
| `1` | Indicates that they are definitely needed. |

### `CasingAndHygienicDoubleTraySS`

**#26** · Type: `Int32` · Unit: — · Group: `Unknown`

Indicates whether a casing and a hygienic double tray made of stainless steel are required as an accessory.

| Value | Description |
|---|---|
| `0` | Indicates that they are not necessarily needed. |
| `1` | Indicates that they are definitely needed. |

### `CasingAndSimplyTray`

**#27** · Type: `Int32` · Unit: — · Group: `Unknown`

Indicates whether a casing and a simple tray made of stainless steel are required as an accessory.

| Value | Description |
|---|---|
| `0` | Indicates that they are not necessarily needed. |
| `1` | Indicates that they are definitely needed. |

### `ClimaCoilOption`

**#28** · Type: `Int32` · Unit: — · Group: `Unknown`

Defines whether a climatization coil is selected, which is needed only for the recalculation of TDB units (UnitSelectionMode = 1 = recalculation of existing unit). Has to be taken from the output of a given selection.

### `ClimatizationCoil`

**#29** · Type: `Int32` · Unit: — · Group: `Unknown`

Indicates whether a climatization coil is required as an accessory.

| Value | Description |
|---|---|
| `0` | Indicates that it is not necessarily needed. |
| `1` | Indicates that it is definitely needed. |

### `Coil_Defender`

**#30** · Type: `Int32` · Unit: — · Group: `Unknown`

Indicates whether a Coil Defender is required as an accessory, which means that the heat exchanger incl. connection system is fully powder-coated to extend the service life of the product thanks to optimum corrosion protection.

| Value | Description |
|---|---|
| `0` | Indicates that it is not necessarily needed. |
| `1` | Indicates that it is definitely needed. |

### `CoilDefrostType`

**#31** · Type: `Int64` · Unit: — · Group: `Unknown`

Defines which specific type of coil defrost is selected, which is needed only for the recalculation of TDB units (UnitSelectionMode = 1 = recalculation of existing unit). Has to be taken from the output of a given selection.

### `CondensatePump`

**#33** · Type: `Int32` · Unit: — · Group: `Unknown`

Indicates whether a condensate pump is required as an accessory.

| Value | Description |
|---|---|
| `0` | Indicates that it is not necessarily needed. |
| `1` | Indicates that it is definitely needed. |

### `ConnectionAndBowCovering`

**#34** · Type: `Int32` · Unit: — · Group: `Unknown`

Indicates whether a connection and bow covering is required as an accessory.

| Value | Description |
|---|---|
| `0` | Indicates that it is not necessarily needed. |
| `1` | Indicates that it is definitely needed. |

### `ConnectionRoof`

**#35** · Type: `Int32` · Unit: — · Group: `Unknown`

Indicates whether a header cover, also known as a connection roof, is required as an accessory.

| Value | Description |
|---|---|
| `0` | Indicates that it is not necessarily needed. |
| `1` | Indicates that it is definitely needed. |

### `ConnectionSystem`

**#36** · Type: `Boolean` · Unit: — · Group: `Unknown`

Indicates whether a thread or flange connection is required as an accessory.

| Value | Description |
|---|---|
| `0` | Indicates that it is not necessarily needed. |
| `1` | Indicates that it is definitely needed. |

### `ConnectionType`

**#37** · Type: `Int32` · Unit: — · Group: `Unknown`

Defines which type of thread or flange connection is required as an accessory, if it is required via ConnectionSystem = true.

| Value | Description |
|---|---|
| `3` | Lapped flanges |
| `4` | Welding neck flanges |
| `5` | Thread connection |

### `ContainerTransportRail`

**#38** · Type: `Int32` · Unit: — · Group: `Unknown`

Indicates whether guide rails for container transport are required as an accessory

| Value | Description |
|---|---|
| `0` | Indicates that it is not necessarily needed. |
| `1` | Indicates that it is definitely needed. |

### `ControllerAllocation`

**#39** · Type: `Int32` · Unit: — · Group: `Unknown`

If a switch cabinet or terminal box is selected, this defines the allocation of the controller to the unit:

| Value | Description |
|---|---|
| `1` | Allocation is set automatically |
| `3` | One controller per unit |
| `4` | One controller per fluid circuit |
| `5` | No controller selected |

### `ControllerByPassObligatory`

**#40** · Type: `Int32` · Unit: — · Group: `Unknown`

Specifies if a bypass is required for the controller.

| Value | Description |
|---|---|
| `0` | Bypass is not needed |
| `1` | Bypass is needed |

### `ControllerInterface`

**#41** · Type: `Int32` · Unit: — · Group: `Unknown`

Defines the required interface for the controller

| Value | Description |
|---|---|
| `1` | Undefined |
| `2` | No Interface needed |
| `3` | Modbus RTU |
| `4` | Profibus DP |
| `5` | Profinet |
| `6` | Bacnet IP |
| `7` | Bacnet MS/TP |

### `ControllerType`

**#42** · Type: `Int32` · Unit: — · Group: `Unknown`

Defines the needed controller type

| Value | Description |
|---|---|
| `10` | GMM EC with remote display (only for EC fans) |
| `2` | Controller type is selected automatically |
| `3` | Only continuous controllers (EC, sinus or phase cut controllers) |
| `4` | Phase cut (only for AC fans) |
| `6` | Step controller (only for AC fans) |
| `7` | GMM EC (only for EC fans) |
| `8` | GMM Sincon lite (only for AC fans) |
| `9` | GMM phase cut lite (only for AC fans) |

### `CoreTubeMaterial`

**#43** · Type: `Int32` · Unit: — · Group: `Unknown`

Defines the needed core tube material (without inner structure type). Only relevant if UnitSelectionMode = 0 (unit search mode).

| Value | Description |
|---|---|
| `0` | no restriction |
| `C` | Copper |
| `F` | Hot dip galvanized steel |
| `V` | Stainless steel type A (normal quality) |
| `W` | Stainless steel type B (higher quality) |
| `Z` | Galvanized steel |

### `CorrosionProtectionClass`

**#44** · Type: `Int32` · Unit: — · Group: `Unknown`

Defines the needed corrosion protection class

| Value | Description |
|---|---|
| `0` | no special corrosion protection class needed |
| `335` | corrosion protection class 4 needed |
| `336` | corrosion protection class 5 needed |

### `DefaultIndoorVarnishing`

**#46** · Type: `Int32` · Unit: — · Group: `Unknown`

Indicates whether for a unit, which as standard is not varnished, the option “varnishing with the standard indoor color” [e.g. Europe: 9003] is required as an accessory.

| Value | Description |
|---|---|
| `0` | Indicates that it is not necessarily needed. |
| `1` | Indicates that it is definitely needed. |

### `DefaultOutdoorVarnishing`

**#47** · Type: `Int32` · Unit: — · Group: `Unknown`

Indicates whether for a unit, which as standard is not varnished, the option “varnishing with the standard outdoor color” is required as an accessory.

| Value | Description |
|---|---|
| `0` | Indicates that it is not necessarily needed. |
| `1` | Indicates that it is definitely needed. |

### `DefrostFlap`

**#48** · Type: `Int32` · Unit: — · Group: `Unknown`

Indicates whether a defrost flap with heated frame is required as an accessory.

| Value | Description |
|---|---|
| `0` | Indicates that it is not necessarily needed. |
| `1` | Indicates that it is definitely needed. |

### `Defrosting`

**#49** · Type: `Int32` · Unit: — · Group: `Unknown`

Defines the needed standard defrosting.

| Value | Description |
|---|---|
| `0` | No defrosting needed |
| `258` | Electric defrost kit to be installed by customer |
| `263` | Electric defrost mounted and wired at factory (meta option, no details for coil or tray). |
| `264` | Hot gas defrost (meta option, no details for coil or tray). |
| `265` | Warm brine defrost (meta option, no details for coil or tray). |
| `339` | Electric defrost efficiency-optimized (meta option, no details for coil or tray). |
| `80` | Air Defrost |

### `DefrostingHotGasFeed`

**#50** · Type: `Int32` · Unit: — · Group: `Unknown`

Defines explicitely the position of the feed of the hot gas defrost in coil. Currently this is only used, if a user defined defrosting is selected, and there a hot gas defrosting in coil or hot gas defrosting without connection is selected, and it’s a unit for the Eurasian market.

| Value | Description |
|---|---|
| `0` | Feed at the top |
| `1` | Feed at the bottom |
| `2` | Feed at the center |

### `DefrostingUserDefined`

**#51** · Type: `List`1` · Unit: — · Group: `Unknown`

Defines the needed user defined defrosting. Empty list: no user defined defrosting. Otherwise: List of defrosting options, selected via their IDs.

| Value | Description |
|---|---|
| `11` | Electric defrost coil (standard) |
| `12` | Electric defrost tray (standard) |
| `13` | Hot gas defrost coil (standard) |
| `14` | Hot gas defrost tray (standard) |
| `23` | Electric defrost in coil and tray (combined). |
| `261` | Warm brine defrost coil |
| `262` | Warm brine defrost tray |
| `264` | Hot gas defrost (meta option, no details for coil or tray). |
| `312` | El. defrost coil light for t0>=-10°C |
| `338` | Electric defrost in coil and tray efficiency-optimized (combined). |
| `340` | Electric defrost kit to be installed by customer efficiency-optimized |
| `73` | Electric defrost coil heavy for t0<-40°C |
| `74` | Electric defrost tray heavy for t0<-40°C |

### `DoubleFanPlates`

**#53** · Type: `Int32` · Unit: — · Group: `Unknown`

Defines whether a set of double fan plates is required as an accessory:

| Value | Description |
|---|---|
| `0` | Indicates that it is not necessarily needed. |
| `1` | Indicates that it is definitely needed. |

### `DoubleTrayInsulated`

**#54** · Type: `Int32` · Unit: — · Group: `Unknown`

Defines whether an insulated double tray is required as an accessory.

| Value | Description |
|---|---|
| `0` | Indicates that it is not necessarily needed. |
| `1` | Indicates that it is definitely needed. |

### `ECFanOption`

**#55** · Type: `Int32` · Unit: — · Group: `Unknown`

Specifies whether the unit must have fans with EC motor technology.

| Value | Description |
|---|---|
| `0` | EC technology is not required. |
| `1` | EC technology is required. |

### `ECJunctionBoxWithMainSwitch`

**#56** · Type: `Int32` · Unit: — · Group: `Unknown`

If there is the controls accessory "EC junction box" selected (when SwitchCabinetType=8) then this value specifies whether the junction box must have a main switch.

| Value | Description |
|---|---|
| `0` | Main switch is not required |
| `1` | Main switch is required |

### `EfficiencyClass`

**#57** · Type: `String` · Unit: — · Group: `Unknown`

Specifies the at least required efficiency class of the found units.

| Value | Description |
|---|---|
| `No filter defined` | { get; set; } All efficiency classes allowed |
| `A` | Only units with efficiency class A or better should be found |
| `A+` | Only units with efficiency class A+ or better should be found |
| `A++` | Only units with efficiency class A++ or better should be found |
| `B` | Only units with efficiency class B or better should be found |
| `C` | Only units with efficiency class C or better should be found |
| `D` | Only units with efficiency class D or better should be found |
| `E` | Only units with efficiency class E or better should be found |

### `EmptyCasing`

**#58** · Type: `Int32` · Unit: — · Group: `Unknown`

Specifies whether an the accessory empty casing is required

| Value | Description |
|---|---|
| `0` | an empty casing is not required |
| `1` | an empty casing is required |

### `EmptyCasingBottomSheet`

**#59** · Type: `Boolean` · Unit: — · Group: `Unknown`

If an empty casing is selected this value defines whether a bottom sheet must be included

| Value | Description |
|---|---|
| `0` | A bottom sheet is not required |
| `1` | A bottom sheet is required |

### `EmptyCasingHeight`

**#60** · Type: `Int32` · Unit: `mm` · Group: `Unknown`

If an empty casing is selected this value defines the required height of the empty casing in mm

### `EmptyCasingIsolation`

**#61** · Type: `Boolean` · Unit: — · Group: `Unknown`

If an empty casing is selected this value defines whether an isolation must be included

| Value | Description |
|---|---|
| `0` | An isolation is not required |
| `1` | An isolation is required |

### `EmptyCasingLength`

**#62** · Type: `Int32` · Unit: `mm` · Group: `Unknown`

If an empty casing is selected this value defines the required length of the empty casing in mm

### `EnableForMounting`

**#63** · Type: `Int32` · Unit: — · Group: `Unknown`

If there is any switch cabinet or terminal box selected, then this value specifies whether it must be mountable.

| Value | Description |
|---|---|
| `0` | AirHeater: The switch cabinet or terminal box does not have to be mountable. AirCooler: 0-10V signal not required. |
| `1` | AirHeater: The switch cabinet or terminal box must be mountable. AirCooler: 0-10V signal required (only EC!) |

### `Epoxy_Fins`

**#64** · Type: `Int32` · Unit: — · Group: `Unknown`

Indicates whether epoxy fins are required.

### `ErP_Compliant`

**#65** · Type: `Boolean` · Unit: `mm` · Group: `Unknown`

Filter to show only units that apply to EU’s Energy-Related Products Directive (ErP Directive 2009/125/EC).

### `ExhaustDuct`

**#69** · Type: `Int32` · Unit: — · Group: `Unknown`

Indicates whether an exhaust duct is required as an accessory.

### `ExtendedLegs`

**#70** · Type: `Int32` · Unit: — · Group: `Unknown`

Defines the length of (extended) legs.

| Value | Description |
|---|---|
| `213` | Set of extended legs 1100 mm |
| `214` | Set of extended legs 1200 mm |
| `6` | Set of extended legs 600 mm |
| `7` | Set of extended legs 800 mm |
| `8` | Set of extended legs 1000 mm |

### `FanFuseSpec`

**#72** · Type: `Int32` · Unit: — · Group: `Unknown`

Defines the fan protection.

| Value | Description |
|---|---|
| `0` | Undefined |
| `1` | Consider all types |
| `2` | Best price |
| `3` | High fail safe |
| `4` | Fans individually fused |
| `5` | Up to two fans per fuse |
| `6` | Up to four fans per fuse |
| `7` | Up to three fans per fuse |

### `FanRingHeater`

**#73** · Type: `Int32` · Unit: — · Group: `Unknown`

Indicates whether fan ring heaters are required as an accessory.

### `FinConinID`

**#74** · Type: `Int32` · Unit: — · Group: `Unknown`

Specifies the internal FinConinID.

### `FinPitch0Max`

**#75** · Type: `Double` · Unit: `mm` · Group: `Unknown`

Max. fin pitch

### `FinPitch0Min`

**#76** · Type: `Double` · Unit: `mm` · Group: `Unknown`

Min. fin pitch

### `FinPitchVariableOnly`

**#77** · Type: `Int32` · Unit: — · Group: `Unknown`

Specifies whether there should only units with variable (staged) fin pitch (different fin pitch values within one unit)

| Value | Description |
|---|---|
| `0` | No restriction for the fin pitch |
| `1` | Only units with variable fin pitch should be found |

### `FinSpacingInputMode`

**#78** · Type: `Int32` · Unit: — · Group: `Unknown`

Defines the mode how the fin spacing filter is specified in the input data

| Value | Description |
|---|---|
| `0` |  |
| `M` | inimum and maximum fin spacing is given (FinPitch0Min and FinPitch0Max must contain the minimum and maximum fin spacing values in mm) |
| `1` |  |
| `M` | inimum and maximum number of fins per inc is given (FinPitch0Min and FinPitch0Max must contain the minimum and maximum number of fins per inch) |

### `ForEnergySavingController`

**#97** · Type: `Int32` · Unit: — · Group: `Unknown`

For energy-saving applications, if a switch cabinet or terminal box is selected.

### `ForNoiseUse`

**#98** · Type: `Int32` · Unit: — · Group: `Unknown`

For noise-sensitive applications, if a switch cabinet or terminal box is selected.

### `FullCoverageDoubleTrayInsulated`

**#101** · Type: `Int32` · Unit: — · Group: `Unknown`

Indicates whether a full coverage double tray with insulation is required as an accessory.

| Value | Description |
|---|---|
| `0` | Indicates that the full coverage double tray with insulation is not necessarily needed. |
| `1` | Indicates that the full coverage double tray with insulation is definitely needed. |

### `GuentnerStreamer`

**#109** · Type: `Int32` · Unit: — · Group: `Unknown`

Indicates whether a Streamer (for an increased air throw) is required as an accessory.

| Value | Description |
|---|---|
| `0` | Indicates that the streamer is not necessarily needed. |
| `1` | Indicates that the streamer is definitely needed. |

### `HBLKValve`

**#110** · Type: `Int32` · Unit: — · Group: `Unknown`

Indicates whether a HBLK valve is required as an accessory.

### `HeatingStrapsAtAirOutlet`

**#111** · Type: `Int32` · Unit: — · Group: `Unknown`

Indicates whether el. heating straps (at air outlet) are required as an accessory.

### `HingedFanPlate`

**#112** · Type: `Int32` · Unit: — · Group: `Unknown`

Indicates whether hinged fan plates are required as an option.

### `HotGasInterConnectingTubing`

**#113** · Type: `Int32` · Unit: — · Group: `Unknown`

Indicates whether hot gas interconnecting tubing is required as an accessory.

| Value | Description |
|---|---|
| `34` | with check value |
| `66` | without check value |

### `InletHood`

**#115** · Type: `Int32` · Unit: — · Group: `Unknown`

Indicates whether an inlet hood is required as an accessory.

### `InletNippleOuterDiameter`

**#116** · Type: `String` · Unit: `mm` · Group: `Unknown`

Defines the diameter of nipple(s) at the inlet.

### `InletPosLeft`

**#117** · Type: `Int32` · Unit: — · Group: `Unknown`

Indicates whether connections in air flow direction left is required as an option.

### `InletPosRight`

**#118** · Type: `Int32` · Unit: — · Group: `Unknown`

Indicates whether connections in air flow direction right is required as an option.

### `InputModeCapacity`

**#120** · Type: `Int32` · Unit: — · Group: `Unknown`

Capacity calculation mode

| Value | Description |
|---|---|
| `0` | The capacity is fixed, the area reserve is adapted to the capacity. |
| `1` | The specified capacity is a target value, the actual capacity is optimized individually for each device or coil. |
| `2` | The capacity is fixed indirectly via the air-side specifications; the area reserve is adapted to the capacity. Only possible for coils. |
| `3` | The capacity is fixed, the condensing temperature is adapted to the capacity. Only possible for condenser coils. |

### `InspectionCover`

**#121** · Type: `Int32` · Unit: — · Group: `Unknown`

Indicates whether an inspection cover is required as an accessory.

### `IoTModule`

**#122** · Type: `Int32` · Unit: — · Group: `Unknown`

Indicates whether an aicore link (IoT-Module) is required as an accessory.

### `LastChangedKey`

**#130** · Type: `String` · Unit: — · Group: `Unknown`

This parameter is not relevant for findunits but UI.

### `LowEvapTempDesign`

**#132** · Type: `Int32` · Unit: — · Group: `Unknown`

Indicates whether a the device must handle low temeratures.

### `ManualSpeedController`

**#133** · Type: `Int32` · Unit: — · Group: `Unknown`

Indicates whether a manual speed controller is required as an accessory.

### `MaxNumberOfHits`

**#135** · Type: `Int32` · Unit: — · Group: `Unknown`

Maximum number of results.

### `MaxOperatingPressure`

**#136** · Type: `Int32` · Unit: `bar` · Group: `Unknown`

Indicates the maximum fluid pressure of the device.

### `MaxSoundTolerance`

**#138** · Type: `Double` · Unit: `dBA` · Group: `Unknown`

Specifies how loud a unit may be.

### `MiniumRequiredSubcooling`

**#139** · Type: `Double` · Unit: `K_TD` · Group: `Unknown`

If a subcooler is selected, how big is the temerature difference between the primary and secondard circuit.

### `MountedAndWired`

**#141** · Type: `Int32` · Unit: — · Group: `Unknown`

Specifies if the fans have to be mounted and wired or delivered seperately.

### `MountedLegs`

**#142** · Type: `Int32` · Unit: — · Group: `Unknown`

Indicates whether legs will be attached to the device so it can stand. If not included, the device has to be mounted.

### `MountedLegsGS`

**#143** · Type: `Int32` · Unit: — · Group: `Unknown`

When MountedLegs are included, these are in galvanized steel and therefore have no corrosion protection.

### `MountedLegsSS`

**#144** · Type: `Int32` · Unit: — · Group: `Unknown`

When MountedLegs are included, these are made of stainless steel and therefore have a corrosion protection.

### `MultipleCircuits`

**#145** · Type: `Int32` · Unit: — · Group: `Unknown`

Indicates if the device can have multiple circuits.

### `NoInletNipples`

**#147** · Type: `String` · Unit: — · Group: `Unknown`

Defines the number of nipples at the inlet.

### `NoOfCircuitsThermo`

**#148** · Type: `Int32` · Unit: — · Group: `Unknown`

Number of required thermo circuits.

### `NoOfPasses`

**#151** · Type: `Int32` · Unit: — · Group: `Unknown`

Number of required passes.

### `NoOutletNipples`

**#152** · Type: `String` · Unit: — · Group: `Unknown`

Defines the number of nipples at the outlet.

### `OutletNippleOuterDiameter`

**#154** · Type: `String` · Unit: `mm` · Group: `Unknown`

Defines the diameter of nipple(s) at the outlet.

### `OverpressureFlap`

**#155** · Type: `Int32` · Unit: — · Group: `Unknown`

Indicates whether an OverpressureFlap is required as accessory.

### `PreSelection`

**#159** · Type: `Int32` · Unit: — · Group: `Unknown`

This parameter is not relevant for findunits but UI.

### `PressureSensor`

**#160** · Type: `Int32` · Unit: — · Group: `Unknown`

Indicates whether a pressure sensor is required as an accessory.

### `PreviousChangedValue`

**#161** · Type: `String` · Unit: — · Group: `Unknown`

This parameter is not relevant for findunits but UI.

### `RalNumber`

**#163** · Type: `Int32` · Unit: — · Group: `Unknown`

Definer RAL number for special varnishing.

### `ReducedLegs`

**#164** · Type: `Int32` · Unit: — · Group: `Unknown`

Indicates whether reduced legs are required as an accessory.

### `RepairSwitch`

**#165** · Type: `Int32` · Unit: — · Group: `Unknown`

Indicates whether a repair switch is required as an accessory.

| Value | Description |
|---|---|
| `0` | No Repair switch |
| `233` | Repair switch selected |

### `RepairSwitchPosition`

**#166** · Type: `Int32` · Unit: — · Group: `Unknown`

Defines position of repair switch.

| Value | Description |
|---|---|
| `0` | Undefined |
| `1` | Mounted close to the fan |
| `2` | Mounted at the front |
| `3` | Standard |

### `RepairSwitchType`

**#167** · Type: `Int32` · Unit: — · Group: `Unknown`

Defines type of repair switch.

| Value | Description |
|---|---|
| `0` | Undefined |
| `1` | Two-turn (star/delta switchable) (9-pole) |
| `2` | Single-speed (7-pole) |

### `RepairSwitchWiring`

**#168** · Type: `Int32` · Unit: — · Group: `Unknown`

Defines wiring type for repair switch.

| Value | Description |
|---|---|
| `0` | Undefined |
| `1` | Preferably individually wired, i.e. one rep. switch per fan |
| `2` | Single wired, i.e. one rep. switch per fan |
| `3` | Preferably wired in pairs, i.e. two fans are switched with one rep. switch |
| `4` | Wired in pairs, i.e. two fans are switched with one repair switch |
| `5` | Preferably a single repair switch for all fans |
| `6` | A single repair switch for all fans |

### `SeparationSheetWithHeater`

**#169** · Type: `Int32` · Unit: — · Group: `Unknown`

Indicates whether a separation sheet with heater is required as an accessory.

### `Shutup`

**#170** · Type: `Int32` · Unit: — · Group: `Unknown`

Indicates whether a defrost hose is required as an accessory.

### `SoundAbsorber`

**#171** · Type: `Int32` · Unit: — · Group: `Unknown`

Indicates whether a sound absorber is required as an accessory.

### `SpecialVarnishing`

**#174** · Type: `Int32` · Unit: — · Group: `Unknown`

Indicates whether special varnishing is required as an option.

### `Subcooler`

**#175** · Type: `Int32` · Unit: — · Group: `Unknown`

Indicates whether a subcooler is required as an option.

### `SubcriticAirRelHumidity`

**#176** · Type: `Double` · Unit: `Percent` · Group: `Unknown`

This parameter defines the subcritical air absolute humidity in %, for CO2 gas coolers.

### `SubcriticAirTemperature`

**#177** · Type: `Double` · Unit: `Degree_C` · Group: `Unknown`

This parameter defines the subcritical air dry bulb temperature in °C, for CO2 gas coolers.

### `SubcriticAirWetBulbTemp`

**#178** · Type: `Double` · Unit: `Degree_C` · Group: `Unknown`

This parameter defines the subcritical air wet bulb temperature in °C, for CO2 gas coolers.

### `SubcriticFluidPressureDropMax`

**#179** · Type: `Double` · Unit: `K` · Group: `Unknown`

This parameter defines the maximum allowable subcritical pressure drop in K for CO2 gas coolers.

### `SubcriticFluidTempCond`

**#180** · Type: `Double` · Unit: `Degree_C` · Group: `Unknown`

This parameter defines the subcritical condensing temperature in °C, for CO2 gas coolers

### `SubcriticFluidTempInlet`

**#181** · Type: `Double` · Unit: `Degree_C` · Group: `Unknown`

This parameter defines the subcritical inlet temperature, aka the hot gas temperature in °C, for CO2 gas coolers.

### `SubcriticIsHotGasAuto`

**#182** · Type: `Boolean` · Unit: — · Group: `Unknown`

This parameter defines whether the subcritical inlet temperature, aka hot gas temperature should be set automatically or set using the subcriticFluidTempInlet input.

| Value | Description |
|---|---|
| `FALSE` | The subcritical inlet temperature is defined using the subcriticFluidTempInlet input |
| `TRUE` | The subcritical inlet temperature is set automatically |

### `SwitchCabinet`

**#184** · Type: `Int32` · Unit: — · Group: `Unknown`

Indicates whether a switch cabinet is required as an accessory.

| Value | Description |
|---|---|
| `0` | Indicates that the switch cabinet is not necessarily needed. |
| `1` | Indicates that the switch cabinet is definitely needed. |

### `SwitchCabinetAllocation`

**#185** · Type: `Int32` · Unit: — · Group: `Unknown`

This parameter defines the allocation type for the switch cabinet. Either the allocation is automatically set, or it is set to one switch cabinet per unit.

| Value | Description |
|---|---|
| `1` | The allocation is automatic |
| `3` | There is one switch cabinet or terminal box allocated per unit |
| `4` | There is one switch cabinet or terminal box allocated per fluid circuit |
| `5` | There is no switch cabinet or terminal box selected |

### `SwitchCabinetMotorTechnology`

**#186** · Type: `Int32` · Unit: — · Group: `Unknown`

This parameter defines the fan motor technology, or fan motor type, for the switch cabinet.

| Value | Description |
|---|---|
| `-1` | All fan motor technologies are considered |
| `-2` | The fan motor technology is energy optimized |
| `-3` | The fan motor technology is cost optimized |
| `1` | The motor technology is AC |
| `2` | The motor technology is EC (electronically commutated) |

### `SwitchCabinetType`

**#187** · Type: `Int32` · Unit: — · Group: `Unknown`

This parameter defines the type of the switch cabinet.

| Value | Description |
|---|---|
| `0` | Undefined |
| `1` | Consider all types |
| `10` | Switch cabinet with stand cabinet |
| `11` | Switch cabinet with terminal box |
| `12` | Switch cabinet with 0 to 10V terminal box |
| `13` | Modbus Daisy Chain |
| `2` | Set the switch cabinet automatically |
| `3` | Small switch cabinet |
| `4` | GIS-type switch cabinet |
| `5` | GWS-type switch cabinet |
| `6` | GSS-type switch cabinet |
| `7` | GKS-type switch cabinet |
| `8` | Switch cabinet with EC junction box |
| `9` | Switch cabinet with a panel |

### `SwivelingFans`

**#188** · Type: `Int32` · Unit: — · Group: `Unknown`

Indicates whether a swiveling fans, aka hinged fans, is required as an accessory.

| Value | Description |
|---|---|
| `0` | Indicates that the swiveling fans accessory is not necessarily needed. |
| `329` | Indicates that the swiveling fan plate accessory is definitely needed. |
| `68` | Indicates that the swiveling fans accessory is definitely needed. |

### `TCondInputMode`

**#191** · Type: `Int32` · Unit: — · Group: `Unknown`

This parameters defines the convention for defining where the condensing temperature of the input fluid is defined. This is required for refrigerants that have a significant temperature glide.. If the refrigerant considered doesn’t have a glide, then this parameter is not relevant.

| Value | Description |
|---|---|
| `0` | The input condensing temperature is defined at the fluid’s dew point, aka at the condenser’s inlet |
| `1` | The input condensing temperature is defined as a mean, at vapor quality of 0.5s inlet |
| `2` | The input condensing temperature is defined at the fluid’s bubble point, aka at the condenser’s outlet |

### `TelescopicLegs`

**#192** · Type: `Int32` · Unit: — · Group: `Unknown`

Indicates whether telescopic legs, are required as an accessory.

| Value | Description |
|---|---|
| `0` | Indicates that the telescopic legs accessory is not necessarily needed. |
| `1` | Indicates that the telescopic legs accessory is definitely needed. |

### `TerminalBoxType`

**#193** · Type: `Int32` · Unit: — · Group: `Unknown`

Defines the fan wiring type.

| Value | Description |
|---|---|
| `1` | AUTO |
| `2` | All fans grouped together to form a group. |
| `4` | Fans not grouped and individually connected. |

### `ThermoContactType`

**#196** · Type: `Int32` · Unit: — · Group: `Unknown`

This parameter defines the type of the thermo contact cabinet.

| Value | Description |
|---|---|
| `0` | Undefined |
| `1` | Consider all types |
| `2` | Set the thermo contact automatically |
| `3` | Set the thermo contact to manual reset |
| `4` | Set the thermo contact to remote reset |

### `ThreadConnectionMaterial`

**#198** · Type: `Int32` · Unit: — · Group: `Unknown`

This parameter defines the material of the connection if a thread connection is selected as a connection type.

| Value | Description |
|---|---|
| `0` | Undefined |
| `1` | Set the thread connection material automatically |
| `2` | Consider all materials |
| `3` | Set the thread connection material to steel |
| `4` | Set the thread connection material to red brass |
| `5` | Set the thread connection material to stainless steel 304L |
| `6` | Set the thread connection material to stainless steel 316L |

### `Tubing_Of_Integrated_Subcooler_With_Syphon`

**#199** · Type: `Int32` · Unit: — · Group: `Unknown`

Indicates whether tubing of integrated subcooler with syphon required as an accessory (only if subcooler is already selected as an accessory)

| Value | Description |
|---|---|
| `0` | Indicates that the tubing of integrated subcooler with syphon accessory is not necessarily needed. |
| `1` | Indicates that the tubing of integrated subcooler with syphon accessory is definitely needed. |

### `UnitFilterList`

**#200** · Type: `List`1` · Unit: — · Group: `Unknown`

Specifies the filter a list of single units that should be calculated/validated.

### `UVC_Lamp`

**#210** · Type: `Int32` · Unit: — · Group: `Unknown`

Indicates whether UVC lamp is required as an accessory,

| Value | Description |
|---|---|
| `0` | Indicates that the UVC lamp accessory is not necessarily needed. |
| `1` | Indicates that the UVC lamp accessory is definitely needed. |

### `VersionNumber`

**#211** · Type: `Int32` · Unit: — · Group: `Unknown`

Version number of the Guentner API

### `VibrationDampers`

**#212** · Type: `Int32` · Unit: — · Group: `Unknown`

Indicates whether Vibration dampers are required as an accessory.

| Value | Description |
|---|---|
| `0` | Indicates that the Vibration dampers accessory is not necessarily needed. |
| `1` | Indicates that the Vibration dampers accessory is definitely needed. |

### `WallSuspension`

**#213** · Type: `Int32` · Unit: — · Group: `Unknown`

Indicates whether Wall suspension is required as an accessory.

| Value | Description |
|---|---|
| `0` | Indicates that the Wall suspension accessory is not necessarily needed. |
| `1` | Indicates that the Wall suspension accessory is definitely needed. |

### `WeldingNeckFlangeNominalPressure`

**#220** · Type: `Int32` · Unit: — · Group: `Unknown`

This parameters defines the nominal pressure rating for flanges (lapped flanges or welding neck flanges):

| Value | Description |
|---|---|
| `3` | PN16 B1 (DIN EN 1092-1) (only available for welding neck flanges) |
| `4` | PN40 B1 (DIN EN 1092-1) (only available for welding neck flanges) |
| `5` | PN40 D+C (DIN EN 1092-1) (only available for welding neck flanges) |
| `7` | PN10 (only available for lapped flanges, with brazing neck) |

### `Wiring_To_Junction_Box_At_Side`

**#221** · Type: `Int32` · Unit: — · Group: `Unknown`

Indicates whether Wiring to the terminal box is required as an accessory only for the old TDB series.

| Value | Description |
|---|---|
| `0` | Indicates that the Wiring to the terminal box accessory is not necessarily needed. |
| `1` | Indicates that the Wiring to the terminal box accessory is definitely needed. |

### `Wiring_To_Terminal_Box`

**#222** · Type: `Int32` · Unit: — · Group: `Unknown`

Indicates whether Wiring to the terminal box is required as an accessory for the newer KDB series.

| Value | Description |
|---|---|
| `0` | Indicates that the Wiring to the terminal box accessory is not necessarily needed. |
| `1` | Indicates that the Wiring to the terminal box accessory is definitely needed. |
