function calculatePercentile(array, percentile) {
  if (array.length === 0) {
    console.log("Array is empty.");
    return { result: 0, min_value: 0, max_value: 0 }
  }

  array.sort((a, b) => a - b);
  const min_value = array.length != 0 ? array[0] : 0;
  const max_value = array.length != 0 ? array[array.length - 1] : 0;

  const index = (percentile / 100) * (array.length - 1);
  if (Number.isInteger(index)) {
    return { result: array[index], min_value, max_value };
  } else {
    const lowerIndex = Math.floor(index);
    const upperIndex = Math.ceil(index);
    const lowerValue = array[lowerIndex];
    const upperValue = array[upperIndex];
    const fraction = index - lowerIndex;
    let result = (upperValue - lowerValue) * fraction + lowerValue;

    return { result: result.toFixed(2), min_value, max_value }
  }
}


function calculateMean(array) {
  if (array.length === 0) {
    throw new Error("Array is empty.");
  }

  const sum = array.reduce((total, num) => total + num, 0);
  const mean = sum / array.length;
  return mean;
}

const calculate = (times, logger) => {
  const startTime = Date.now();
  console.log("startTime", startTime)
  const r1 = calculatePercentile(times, 99);
  const per_50 = calculateMean(times);
  const r2 = calculatePercentile(times, 50);
  const endTime = Date.now();
  console.log("endtime", endTime)

  logger.info(JSON.stringify({
    "99th Percentile": `${r1.result}ms`,
    "50 Percentile": `${r2.result}ms`,
    "min time required for request": `${r1.min_value}ms`,
    "max time required for request": `${r1.max_value}ms`,
    "average": `${per_50}ms`,
    "proccessing time": `${(endTime - startTime)}ms`,
  }))


  console.log({
    "99th Percentile": `${r1.result}ms`,
    "50 Percentile": `${r2.result}ms`,
    "min time required for request": `${r1.min_value}ms`,
    "max time required for request": `${r1.max_value}ms`,
    "average": `${per_50}ms`,
    "proccessing time": `${(endTime - startTime)}ms`,
  })
}

module.exports = {
  calculateMean,
  calculatePercentile,
  calculate
}