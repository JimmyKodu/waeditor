(function () {
  const PREFIX = "WAEDITOR1:";

  const ids = {
    rageHighThreshold: document.getElementById("rageHighThreshold"),
    rageHighVoice: document.getElementById("rageHighVoice"),
    rageLowThreshold: document.getElementById("rageLowThreshold"),
    rageLowVoice: document.getElementById("rageLowVoice"),
    dotName: document.getElementById("dotName"),
    dotVoice: document.getElementById("dotVoice"),
    chargeName: document.getElementById("chargeName"),
    interceptName: document.getElementById("interceptName"),
    mobilityVoice: document.getElementById("mobilityVoice"),
    overpowerCycleSec: document.getElementById("overpowerCycleSec"),

    previewRage: document.getElementById("previewRage"),
    previewHasDot: document.getElementById("previewHasDot"),
    previewChargeCd: document.getElementById("previewChargeCd"),
    previewInterceptCd: document.getElementById("previewInterceptCd"),
    previewRendRemaining: document.getElementById("previewRendRemaining"),
    previewSinceLastProc: document.getElementById("previewSinceLastProc"),
    previewOutput: document.getElementById("previewOutput"),

    previewBtn: document.getElementById("previewBtn"),
    generateBtn: document.getElementById("generateBtn"),
    parseBtn: document.getElementById("parseBtn"),
    waString: document.getElementById("waString"),
    status: document.getElementById("status"),
  };

  function toNumber(input, fallback) {
    const value = Number.parseFloat(input.value);
    return Number.isFinite(value) ? value : fallback;
  }

  function readConfigFromForm() {
    return {
      version: 1,
      class: "warrior",
      spec: "arms",
      alerts: {
        rageHigh: {
          threshold: toNumber(ids.rageHighThreshold, 60),
          voice: ids.rageHighVoice.value.trim(),
        },
        rageLow: {
          threshold: toNumber(ids.rageLowThreshold, 25),
          voice: ids.rageLowVoice.value.trim(),
        },
        dotMissing: {
          dotName: ids.dotName.value.trim(),
          voice: ids.dotVoice.value.trim(),
        },
        mobility: {
          chargeName: ids.chargeName.value.trim(),
          interceptName: ids.interceptName.value.trim(),
          voice: ids.mobilityVoice.value.trim(),
        },
        overpowerPrediction: {
          cycleSec: Math.max(1, toNumber(ids.overpowerCycleSec, 6)),
        },
      },
    };
  }

  function writeConfigToForm(config) {
    ids.rageHighThreshold.value = config?.alerts?.rageHigh?.threshold ?? 60;
    ids.rageHighVoice.value = config?.alerts?.rageHigh?.voice ?? "怒气高，使用技能1";
    ids.rageLowThreshold.value = config?.alerts?.rageLow?.threshold ?? 25;
    ids.rageLowVoice.value = config?.alerts?.rageLow?.voice ?? "怒气低，使用技能2";
    ids.dotName.value = config?.alerts?.dotMissing?.dotName ?? "撕裂";
    ids.dotVoice.value = config?.alerts?.dotMissing?.voice ?? "目标没有撕裂，及时补DOT";
    ids.chargeName.value = config?.alerts?.mobility?.chargeName ?? "冲锋";
    ids.interceptName.value = config?.alerts?.mobility?.interceptName ?? "拦截";
    ids.mobilityVoice.value = config?.alerts?.mobility?.voice ?? "优先使用冷却更快的位移技能";
    ids.overpowerCycleSec.value = config?.alerts?.overpowerPrediction?.cycleSec ?? 6;
  }

  function encodeWaString(config) {
    const json = JSON.stringify(config);
    return PREFIX + btoa(unescape(encodeURIComponent(json)));
  }

  function decodeWaString(value) {
    if (!value.startsWith(PREFIX)) {
      throw new Error(`字符串格式错误，必须以 ${PREFIX} 开头`);
    }
    const encoded = value.slice(PREFIX.length);
    const json = decodeURIComponent(escape(atob(encoded)));
    return JSON.parse(json);
  }

  function formatSec(sec) {
    return `${Math.max(0, sec).toFixed(1)}秒`;
  }

  function buildPreview(config) {
    const rage = toNumber(ids.previewRage, 0);
    const hasDot = ids.previewHasDot.value === "true";
    const chargeCd = toNumber(ids.previewChargeCd, 0);
    const interceptCd = toNumber(ids.previewInterceptCd, 0);
    const rendRemaining = toNumber(ids.previewRendRemaining, 0);
    const sinceLastProc = toNumber(ids.previewSinceLastProc, 0);

    const lines = [];

    if (rage >= config.alerts.rageHigh.threshold) {
      lines.push(`【怒气】${config.alerts.rageHigh.voice}`);
    }
    if (rage <= config.alerts.rageLow.threshold) {
      lines.push(`【怒气】${config.alerts.rageLow.voice}`);
    }
    if (!hasDot) {
      lines.push(`【DOT】${config.alerts.dotMissing.voice}`);
    }

    const fasterName = chargeCd <= interceptCd ? config.alerts.mobility.chargeName : config.alerts.mobility.interceptName;
    const fasterCd = Math.min(chargeCd, interceptCd);
    lines.push(`【位移】${config.alerts.mobility.voice}：${fasterName}更快（${formatSec(fasterCd)}）`);

    if (rendRemaining <= 0) {
      lines.push("【压制预测】目标没有撕裂，暂时不会触发无条件压制");
    } else {
      const cycle = Math.max(1, config.alerts.overpowerPrediction.cycleSec);
      const offset = sinceLastProc % cycle;
      const nextProc = offset === 0 ? 0 : cycle - offset;

      if (nextProc > rendRemaining) {
        lines.push(`【压制预测】当前撕裂剩余${formatSec(rendRemaining)}，预计不会在撕裂结束前触发`);
      } else {
        lines.push(`【压制预测】预计${formatSec(nextProc)}后触发无条件压制（撕裂剩余${formatSec(rendRemaining)}）`);
      }
    }

    return lines.length ? lines.join("\n") : "当前没有命中语音规则";
  }

  function setStatus(message, isError) {
    ids.status.textContent = message;
    ids.status.classList.toggle("error", Boolean(isError));
  }

  ids.generateBtn.addEventListener("click", function () {
    try {
      const config = readConfigFromForm();
      ids.waString.value = encodeWaString(config);
      setStatus("已生成WA字符串", false);
    } catch (error) {
      setStatus(error.message || "生成失败", true);
    }
  });

  ids.parseBtn.addEventListener("click", function () {
    try {
      const value = ids.waString.value.trim();
      const config = decodeWaString(value);
      writeConfigToForm(config);
      setStatus("已载入WA字符串", false);
      ids.previewOutput.textContent = buildPreview(readConfigFromForm());
    } catch (error) {
      setStatus(error.message || "载入失败", true);
    }
  });

  ids.previewBtn.addEventListener("click", function () {
    ids.previewOutput.textContent = buildPreview(readConfigFromForm());
  });

  ids.previewOutput.textContent = buildPreview(readConfigFromForm());
})();
