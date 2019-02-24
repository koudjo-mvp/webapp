/**
 * Created by P.K.V.M. on 9/9/17.
 */

/**
 * Measure the time of execution in milliseconds of a synchronous task
 *
 * @param {function} toMeasure
 * @param {int} repeatTimes
 * @return {Object}
 */
function StandardBenchmark(toMeasure,repeatTimes){
    if(typeof(repeatTimes) != "number"){
        repeatTimes = 1;
    }

    if(typeof(toMeasure) === "function"){
        var start_status = performance.now();
        var total_taken = 0;
        for(var i = 0;i < repeatTimes;i++){
            var startTimeSubtask = performance.now();
            toMeasure.call();
            var endTimeSubtask = performance.now();
            total_taken += (endTimeSubtask -startTimeSubtask);
        }
        var final_status = performance.now();
    }

    return {
        totalMilliseconds: (final_status - start_status),
        averageMillisecondsPerTask: total_taken / repeatTimes
    };
}

var TimesToBeExecuted = 10;
var TaskToBeExecuted = function(){
    // A task that you want to measure
    console.log("running task!");
};

var TestResult = new StandardBenchmark(TaskToBeExecuted,TimesToBeExecuted);
console.log(TestResult);