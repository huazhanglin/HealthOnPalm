export type {
  HealthKitAuthResult,
  HealthKitHeartRateData,
  HealthKitSleepData,
  HealthKitTodayPayload,
  HKWorkoutRecord,
} from "./types";

/** UTS 原生实现由 utssdk 提供，此处仅作 TypeScript 声明 */
export declare function isHealthKitAvailable(): boolean;
export declare function requestHealthKitAuthorization(
  readTypes?: string[]
): Promise<string>;
export declare function fetchTodayHealthKitJson(): Promise<string>;
export declare function getHealthKitDiagnostics(): string;
