import Foundation
import HealthKit

/// HealthKit 原生桥接（供 UTS index.uts 调用）
@objc public class HealthKitBridge: NSObject {

    private static let store = HKHealthStore()

    private static let defaultReadTypeIds: [String] = [
        "HKQuantityTypeIdentifierStepCount",
        "HKQuantityTypeIdentifierActiveEnergyBurned",
        "HKQuantityTypeIdentifierAppleExerciseTime",
        "HKCategoryTypeIdentifierAppleStandHour",
        "HKCategoryTypeIdentifierSleepAnalysis",
        "HKQuantityTypeIdentifierRestingHeartRate",
        "HKQuantityTypeIdentifierHeartRate",
        "HKWorkoutTypeIdentifier",
    ]

    private static func runOnMain(_ block: @escaping () -> Void) {
        if Thread.isMainThread {
            block()
        } else {
            DispatchQueue.main.async(execute: block)
        }
    }

    @objc public static func isHealthKitAvailable() -> Bool {
        return HKHealthStore.isHealthDataAvailable()
    }

    @objc public static func requestAuthorization(
        _ readTypes: [String],
        _ completion: @escaping (Bool, String?) -> Void
    ) {
        runOnMain {
            guard isHealthKitAvailable() else {
                completion(false, "HealthKit 不可用")
                return
            }

            let shareDesc = Bundle.main.object(forInfoDictionaryKey: "NSHealthShareUsageDescription") as? String
            if shareDesc == nil || shareDesc!.isEmpty {
                completion(false, "缺少健康数据隐私说明，请检查 manifest.json 后重新制作基座")
                return
            }

            let ids = readTypes.isEmpty ? defaultReadTypeIds : readTypes
            var readSet = Set<HKObjectType>()

            for id in ids {
                if let type = Self.objectType(from: id) {
                    readSet.insert(type)
                }
            }

            if readSet.isEmpty {
                completion(false, "未识别任何 HealthKit 读取类型")
                return
            }

            store.requestAuthorization(toShare: Set<HKSampleType>(), read: readSet) { success, error in
                runOnMain {
                    if let error = error {
                        completion(false, error.localizedDescription)
                        return
                    }
                    completion(success, success ? nil : "用户拒绝授权")
                }
            }
        }
    }

    @objc public static func fetchTodayHealthKitData(
        _ completion: @escaping (String?, String?) -> Void
    ) {
        guard isHealthKitAvailable() else {
            runOnMain { completion(nil, "HealthKit 不可用") }
            return
        }

        let calendar = Calendar.current
        let now = Date()
        let dayStart = calendar.startOfDay(for: now)

        var steps = 0
        var activeCalories = 0
        var basalCalories = 0
        var standHours = 0
        var exerciseMinutes = 0
        var sleepDict: [String: Any]? = nil
        var heartRateDict: [String: Any]? = nil
        var workouts: [[String: Any]] = []
        var totalDistanceMeters: Double = 0
        var fetchError: String?
        let resultLock = NSLock()

        let group = DispatchGroup()

        func recordError(_ err: String?) {
            guard let err = err, !err.isEmpty else { return }
            resultLock.lock()
            if fetchError == nil { fetchError = err }
            resultLock.unlock()
        }

        // 步数
        group.enter()
        querySum(
            quantityId: .stepCount,
            unit: .count(),
            from: dayStart,
            to: now
        ) { value, err in
            recordError(err)
            steps = Int(value.rounded())
            group.leave()
        }

        // 活动能量 (kcal)
        group.enter()
        querySum(
            quantityId: .activeEnergyBurned,
            unit: .kilocalorie(),
            from: dayStart,
            to: now
        ) { value, err in
            recordError(err)
            activeCalories = Int(value.rounded())
            group.leave()
        }

        // 锻炼分钟
        group.enter()
        querySum(
            quantityId: .appleExerciseTime,
            unit: .minute(),
            from: dayStart,
            to: now
        ) { value, err in
            recordError(err)
            exerciseMinutes = Int(value.rounded())
            group.leave()
        }

        // 站立小时
        group.enter()
        queryStandHours(from: dayStart, to: now) { count, err in
            recordError(err)
            standHours = count
            group.leave()
        }

        // 睡眠（昨夜窗口：昨日 18:00 → 今日 12:00）
        group.enter()
        let sleepEnd = calendar.date(bySettingHour: 12, minute: 0, second: 0, of: dayStart) ?? now
        let sleepStart = calendar.date(byAdding: .hour, value: -18, to: sleepEnd) ?? dayStart
        querySleep(from: sleepStart, to: min(sleepEnd, now)) { dict, err in
            recordError(err)
            sleepDict = dict
            group.leave()
        }

        // 静息心率 + 平均心率
        group.enter()
        queryHeartRate(from: dayStart, to: now) { dict, err in
            recordError(err)
            heartRateDict = dict
            group.leave()
        }

        // 今日运动记录
        group.enter()
        queryWorkouts(from: dayStart, to: now) { list, err in
            recordError(err)
            workouts = list
            totalDistanceMeters = list.reduce(0.0) { sum, item in
                if let meters = item["distance"] as? Double {
                    return sum + meters
                }
                if let meters = item["distance"] as? Int {
                    return sum + Double(meters)
                }
                return sum
            }
            group.leave()
        }

        group.notify(queue: .main) {
            var payload: [String: Any] = [
                "available": true,
                "date": Self.isoDate(dayStart),
                "steps": steps,
                "activeCalories": activeCalories,
                "basalCalories": basalCalories,
                "standHours": standHours,
                "exerciseMinutes": exerciseMinutes,
                "workouts": workouts,
                "totalDistance": Int(totalDistanceMeters.rounded()),
            ]

            if let sleepDict = sleepDict {
                payload["sleep"] = sleepDict
            }
            if let heartRateDict = heartRateDict {
                payload["heartRate"] = heartRateDict
            }

            runOnMain {
                if let json = Self.jsonString(from: payload) {
                    completion(json, fetchError)
                } else {
                    completion(nil, fetchError ?? "JSON 序列化失败")
                }
            }
        }
    }

    @objc public static func getHealthKitDiagnostics() -> String {
        var parts: [String] = []
        parts.append("available=\(isHealthKitAvailable())")
        parts.append("readTypes=\(defaultReadTypeIds.count)")
        return parts.joined(separator: "; ")
    }

    // MARK: - Private helpers

    private static func objectType(from id: String) -> HKObjectType? {
        switch id {
        case "HKQuantityTypeIdentifierStepCount":
            return HKObjectType.quantityType(forIdentifier: .stepCount)
        case "HKQuantityTypeIdentifierActiveEnergyBurned":
            return HKObjectType.quantityType(forIdentifier: .activeEnergyBurned)
        case "HKQuantityTypeIdentifierAppleExerciseTime":
            return HKObjectType.quantityType(forIdentifier: .appleExerciseTime)
        case "HKCategoryTypeIdentifierAppleStandHour":
            return HKObjectType.categoryType(forIdentifier: .appleStandHour)
        case "HKCategoryTypeIdentifierSleepAnalysis":
            return HKObjectType.categoryType(forIdentifier: .sleepAnalysis)
        case "HKQuantityTypeIdentifierRestingHeartRate":
            return HKObjectType.quantityType(forIdentifier: .restingHeartRate)
        case "HKQuantityTypeIdentifierHeartRate":
            return HKObjectType.quantityType(forIdentifier: .heartRate)
        case "HKWorkoutTypeIdentifier":
            return HKObjectType.workoutType()
        default:
            return nil
        }
    }

    private static func querySum(
        quantityId: HKQuantityTypeIdentifier,
        unit: HKUnit,
        from start: Date,
        to end: Date,
        completion: @escaping (Double, String?) -> Void
    ) {
        guard let type = HKQuantityType.quantityType(forIdentifier: quantityId) else {
            completion(0, nil)
            return
        }

        let predicate = HKQuery.predicateForSamples(withStart: start, end: end, options: .strictStartDate)
        let query = HKStatisticsQuery(
            quantityType: type,
            quantitySamplePredicate: predicate,
            options: .cumulativeSum
        ) { _, result, error in
            if let error = error {
                completion(0, error.localizedDescription)
                return
            }
            let value = result?.sumQuantity()?.doubleValue(for: unit) ?? 0
            completion(value, nil)
        }
        store.execute(query)
    }

    private static func queryStandHours(
        from start: Date,
        to end: Date,
        completion: @escaping (Int, String?) -> Void
    ) {
        guard let type = HKCategoryType.categoryType(forIdentifier: .appleStandHour) else {
            completion(0, nil)
            return
        }

        let predicate = HKQuery.predicateForSamples(withStart: start, end: end, options: .strictStartDate)
        let query = HKSampleQuery(
            sampleType: type,
            predicate: predicate,
            limit: HKObjectQueryNoLimit,
            sortDescriptors: nil
        ) { _, samples, error in
            if let error = error {
                completion(0, error.localizedDescription)
                return
            }
            guard let samples = samples as? [HKCategorySample] else {
                completion(0, nil)
                return
            }
            // 仅统计 stood (value == 0)
            let stood = samples.filter { $0.value == HKCategoryValueAppleStandHour.stood.rawValue }
            let hours = Set(stood.map { Calendar.current.component(.hour, from: $0.startDate) })
            completion(hours.count, nil)
        }
        store.execute(query)
    }

    private static func querySleep(
        from start: Date,
        to end: Date,
        completion: @escaping ([String: Any]?, String?) -> Void
    ) {
        guard let type = HKCategoryType.categoryType(forIdentifier: .sleepAnalysis) else {
            completion(nil, nil)
            return
        }

        let predicate = HKQuery.predicateForSamples(withStart: start, end: end, options: .strictStartDate)
        let query = HKSampleQuery(
            sampleType: type,
            predicate: predicate,
            limit: HKObjectQueryNoLimit,
            sortDescriptors: [NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: true)]
        ) { _, samples, error in
            if let error = error {
                completion(nil, error.localizedDescription)
                return
            }
            guard let samples = samples as? [HKCategorySample], !samples.isEmpty else {
                completion(nil, nil)
                return
            }

            var totalSeconds: TimeInterval = 0
            var deepSeconds: TimeInterval = 0
            var remSeconds: TimeInterval = 0
            var wakeUps = 0

            for sample in samples {
                let duration = sample.endDate.timeIntervalSince(sample.startDate)
                let value = sample.value

                if #available(iOS 16.0, *) {
                    switch value {
                    case HKCategoryValueSleepAnalysis.asleepUnspecified.rawValue,
                         HKCategoryValueSleepAnalysis.asleepCore.rawValue:
                        totalSeconds += duration
                    case HKCategoryValueSleepAnalysis.asleepDeep.rawValue:
                        totalSeconds += duration
                        deepSeconds += duration
                    case HKCategoryValueSleepAnalysis.asleepREM.rawValue:
                        totalSeconds += duration
                        remSeconds += duration
                    case HKCategoryValueSleepAnalysis.awake.rawValue:
                        wakeUps += 1
                    default:
                        break
                    }
                } else {
                    if value == HKCategoryValueSleepAnalysis.asleep.rawValue {
                        totalSeconds += duration
                    } else if value == HKCategoryValueSleepAnalysis.awake.rawValue {
                        wakeUps += 1
                    }
                }
            }

            if totalSeconds <= 0 {
                completion(nil, nil)
                return
            }

            var dict: [String: Any] = [
                "totalHours": round(totalSeconds / 3600 * 10) / 10,
                "wakeUps": wakeUps,
            ]
            if deepSeconds > 0 {
                dict["deepSleepHours"] = round(deepSeconds / 3600 * 10) / 10
            }
            if remSeconds > 0 {
                dict["remSleepHours"] = round(remSeconds / 3600 * 10) / 10
            }
            completion(dict, nil)
        }
        store.execute(query)
    }


    /// 查询运动记录（跑步/游泳/羽毛球等所有类型）
    private static func queryWorkouts(
        from start: Date,
        to end: Date,
        completion: @escaping ([[String: Any]], String?) -> Void
    ) {
        let predicate = HKQuery.predicateForSamples(withStart: start, end: end, options: .strictStartDate)
        let sort = NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: false)
        let query = HKSampleQuery(
            sampleType: HKObjectType.workoutType(),
            predicate: predicate,
            limit: HKObjectQueryNoLimit,
            sortDescriptors: [sort]
        ) { _, samples, error in
            if let error = error {
                completion([], error.localizedDescription)
                return
            }
            guard let workouts = samples as? [HKWorkout], !workouts.isEmpty else {
                completion([], nil)
                return
            }

            var result: [[String: Any]] = []
            for w in workouts {
                var item: [String: Any] = [
                    "id": w.uuid.uuidString,
                    "startDate": Self.isoDateTime(w.startDate),
                    "endDate": Self.isoDateTime(w.endDate),
                    "duration": round(w.duration / 60 * 10) / 10,  // 分钟
                ]

                // 运动类型名称
                item["workoutType"] = Self.workoutTypeName(w.workoutActivityType)
                item["workoutTypeId"] = Self.workoutTypeId(w.workoutActivityType)

                // 能量
                if w.totalEnergyBurned != nil {
                    item["calories"] = Int(w.totalEnergyBurned!.doubleValue(for: .kilocalorie()).rounded())
                }

                // 距离（米 → 公里）
                if w.totalDistance != nil {
                    let meters = w.totalDistance!.doubleValue(for: .meter())
                    item["distance"] = meters
                    item["distanceKm"] = round(meters / 1000 * 100) / 100
                }

                result.append(item)
            }
            completion(result, nil)
        }
        store.execute(query)
    }

    /// 运动类型 → 可读名称（仅用 iOS 14 稳定枚举；其余走 rawValue 中文表）
    private static func workoutTypeName(_ type: HKWorkoutActivityType) -> String {
        switch type {
        case .badminton:                    return "羽毛球"
        case .baseball:                     return "棒球"
        case .basketball:                   return "篮球"
        case .bowling:                      return "保龄球"
        case .boxing:                       return "拳击"
        case .climbing:                     return "攀岩"
        case .crossTraining:                return "综合训练"
        case .cycling:                      return "骑行"
        case .dance:                        return "舞蹈"
        case .elliptical:                   return "椭圆机"
        case .equestrianSports:             return "马术"
        case .functionalStrengthTraining:   return "力量训练"
        case .golf:                         return "高尔夫"
        case .hiking:                       return "徒步"
        case .hockey:                       return "曲棍球"
        case .martialArts:                  return "武术"
        case .paddleSports:                 return "划桨"
        case .rowing:                       return "划船"
        case .rugby:                        return "橄榄球"
        case .running:                      return "跑步"
        case .soccer:                       return "足球"
        case .softball:                     return "垒球"
        case .squash:                       return "壁球"
        case .stairClimbing:                return "爬楼"
        case .swimming:                     return "游泳"
        case .tableTennis:                  return "乒乓球"
        case .tennis:                       return "网球"
        case .traditionalStrengthTraining:  return "传统力量训练"
        case .volleyball:                   return "排球"
        case .walking:                      return "步行"
        case .yoga:                         return "瑜伽"
        case .pilates:                      return "普拉提"
        case .coreTraining:                 return "核心训练"
        case .crossCountrySkiing:           return "越野滑雪"
        case .downhillSkiing:               return "高山滑雪"
        case .snowboarding:                 return "单板滑雪"
        case .snowSports:                   return "雪上运动"
        case .stairs:                       return "楼梯"
        case .highIntensityIntervalTraining: return "HIIT"
        case .jumpRope:                     return "跳绳"
        case .other:                        return "其他运动"
        default:
            return Self.workoutTypeNameByRawValue(Int(type.rawValue))
        }
    }

    /// rawValue 中文兜底（兼容已落库的「运动(4)」等）
    private static func workoutTypeNameByRawValue(_ raw: Int) -> String {
        let map: [Int: String] = [
            1: "美式足球", 2: "射箭", 3: "澳式足球", 4: "羽毛球", 5: "棒球",
            6: "篮球", 7: "保龄球", 8: "拳击", 9: "攀岩", 10: "板球",
            11: "综合训练", 12: "冰壶", 13: "骑行", 14: "舞蹈", 16: "椭圆机",
            17: "马术", 18: "击剑", 19: "钓鱼", 20: "力量训练", 21: "高尔夫",
            22: "体操", 23: "手球", 24: "徒步", 25: "曲棍球", 26: "打猎",
            27: "长曲棍球", 28: "武术", 29: "身心放松", 31: "划桨", 32: "休闲活动",
            33: "热身恢复", 34: "壁球", 35: "划船", 36: "橄榄球", 37: "跑步",
            38: "帆船", 39: "滑冰", 40: "雪上运动", 41: "足球", 42: "垒球",
            43: "壁球", 44: "爬楼", 45: "冲浪", 46: "游泳", 47: "乒乓球",
            48: "网球", 49: "田径", 50: "传统力量训练", 51: "排球", 52: "步行",
            53: "水中健身", 54: "水球", 55: "水上运动", 56: "摔跤", 57: "瑜伽",
            58: "芭蕾形体", 59: "核心训练", 60: "越野滑雪", 61: "高山滑雪",
            62: "柔韧训练", 63: "HIIT", 64: "跳绳", 65: "踢拳", 66: "普拉提",
            67: "单板滑雪", 68: "楼梯", 69: "踏步训练", 70: "轮椅步行",
            71: "轮椅跑步", 72: "太极", 73: "混合有氧", 74: "手摇骑行",
            75: "飞盘", 76: "体感健身", 3000: "其他运动",
        ]
        return map[raw] ?? "运动(\(raw))"
    }

    /// 运动类型 → Apple 枚举 ID（用于存储/调试）
    private static func workoutTypeId(_ type: HKWorkoutActivityType) -> Int {
        return Int(type.rawValue)
    }

    private static func isoDateTime(_ date: Date) -> String {
        let fmt = DateFormatter()
        fmt.dateFormat = "yyyy-MM-dd'T'HH:mm:ss"
        fmt.timeZone = TimeZone.current
        return fmt.string(from: date)
    }

    private static func queryHeartRate(
        from start: Date,
        to end: Date,
        completion: @escaping ([String: Any]?, String?) -> Void
    ) {
        var resting: Double?
        var avg: Double?
        let group = DispatchGroup()
        var errMsg: String?

        if let restingType = HKQuantityType.quantityType(forIdentifier: .restingHeartRate) {
            group.enter()
            let predicate = HKQuery.predicateForSamples(withStart: start, end: end, options: .strictStartDate)
            let sort = NSSortDescriptor(key: HKSampleSortIdentifierEndDate, ascending: false)
            let query = HKSampleQuery(
                sampleType: restingType,
                predicate: predicate,
                limit: 1,
                sortDescriptors: [sort]
            ) { _, samples, error in
                if let error = error { errMsg = error.localizedDescription }
                if let sample = samples?.first as? HKQuantitySample {
                    resting = sample.quantity.doubleValue(for: HKUnit.count().unitDivided(by: .minute()))
                }
                group.leave()
            }
            store.execute(query)
        }

        if let hrType = HKQuantityType.quantityType(forIdentifier: .heartRate) {
            group.enter()
            let predicate = HKQuery.predicateForSamples(withStart: start, end: end, options: .strictStartDate)
            let statsQuery = HKStatisticsQuery(
                quantityType: hrType,
                quantitySamplePredicate: predicate,
                options: .discreteAverage
            ) { _, result, error in
                if let error = error { errMsg = error.localizedDescription }
                if let q = result?.averageQuantity() {
                    avg = q.doubleValue(for: HKUnit.count().unitDivided(by: .minute()))
                }
                group.leave()
            }
            store.execute(statsQuery)
        }

        group.notify(queue: .main) {
            if resting == nil && avg == nil {
                completion(nil, errMsg)
                return
            }
            var dict: [String: Any] = [:]
            if let resting = resting {
                dict["resting"] = Int(resting.rounded())
            }
            if let avg = avg {
                dict["avg"] = Int(avg.rounded())
            }
            if dict.isEmpty {
                completion(nil, errMsg)
                return
            }
            completion(dict, errMsg)
        }
    }

    private static func isoDate(_ date: Date) -> String {
        let fmt = DateFormatter()
        fmt.dateFormat = "yyyy-MM-dd"
        fmt.timeZone = TimeZone.current
        return fmt.string(from: date)
    }

    private static func jsonString(from dict: [String: Any]) -> String? {
        guard JSONSerialization.isValidJSONObject(dict),
              let data = try? JSONSerialization.data(withJSONObject: dict, options: []),
              let str = String(data: data, encoding: .utf8) else {
            return nil
        }
        return str
    }
}
