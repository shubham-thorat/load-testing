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

module.exports = {
  calculateMean,
  calculatePercentile
}