import { Gauge } from "prom-client";
import os from "os";
import osUtils from "node-os-utils";

// 메모리 사용량을 측정하는 Gauge 메트릭 생성
const memoryUsageMetric = new Gauge({
  name: "node_memory_usage_bytes",
  help: "Total memory usage of the node process in bytes",
});

// CPU 사용량을 측정하는 Gauge 메트릭 생성
const cpuUsageMetric = new Gauge({
  name: "system_cpu_usage_percentage",
  help: "CPU usage percentage of the system",
});

// 디스크 사용량을 측정하는 메트릭 생성
const diskUsageMetric = new Gauge({
  name: "system_disk_usage_bytes",
  help: "Disk usage of the system in bytes",
});

// CPU 사용량을 가져오는 함수
const getCpuUsage = () => {
  const cpus = os.cpus();
  let totalIdle = 0;
  let totalTick = 0;

  cpus.forEach((cpu) => {
    for (const type in cpu.times) {
      totalTick += cpu.times[type];
    }
    totalIdle += cpu.times.idle;
  });

  return {
    idle: totalIdle / cpus.length,
    total: totalTick / cpus.length,
  };
};
//cpu를 업데이트 하는 함수
const updateCpuUsageMetric = async () => {
  try {
    const startMeasure = getCpuUsage();

    setTimeout(async () => {
      const endMeasure = await getCpuUsage();

      const idleDifference = endMeasure.idle - startMeasure.idle;
      const totalDifference = endMeasure.total - startMeasure.total;

      const percentageCpuUsage = 100 - (100 * idleDifference) / totalDifference;
      cpuUsageMetric.set(percentageCpuUsage);
    }, 100); // 측정 주기 설정
  } catch (error) {
    console.error("Failed to update CPU usage metric:", error);
  }
};

// 메모리 값을 업데이트하는 함수
const updateMemoryUsageMetric = () => {
  try {
    const memoryUsageInBytes = process.memoryUsage().heapUsed;
    memoryUsageMetric.set(memoryUsageInBytes);
  } catch (error) {
    console.error("Failed to update memory usage metric:", error);
  }
};
//디스크 사용률을 계산하는 함수
async function updateDiskUsage() {
  try {
    const diskInfo = await osUtils.drive.info();
    // 바이트 단위 대신 메가바이트 단위로 디스크 사용량을 계산
    const diskUsageInBytes =
      diskInfo.totalGb * 1024 * 1024 * 1024 * (diskInfo.usedPercentage / 100);
    diskUsageMetric.set(diskUsageInBytes);
  } catch (error) {
    console.error("Error updating disk usage:", error);
  }
}
// 타이머를 사용하여 매 초마다 CPU 및 메모리 메트릭을 업데이트
setInterval(() => {
  updateCpuUsageMetric();
  updateMemoryUsageMetric();
  updateDiskUsage();
}, 1000); // 1초마다 업데이트

export {
  memoryUsageMetric,
  updateMemoryUsageMetric,
  cpuUsageMetric,
  updateCpuUsageMetric,
  diskUsageMetric,
  updateDiskUsage,
};
