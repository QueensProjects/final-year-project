// Title: genetic.js
// Author: Daniel Cooke 
// Date: 2018-05-01 23:21:31
/**
 * for use as a module use require or ES6 import syntax
 */

 //===========================================================================================
 //		GLOBAL VARIABLES
 //===========================================================================================  
let rows = 0;
let cols = 0;
let costMatrix = [];
let groups = [];
let maxAssignments = 0;
let maxColumnAssignments = 0;
let minimumTotalCost = 0;
let logging = true;
let generator;


/**
 * The distance function is the most important function in the algorithm, it determines how eligible a candidate solution is
 * @param {*} candidate - A candidate solution
 */
function distance(candidate) {

    // Minimise cost
    const cost = candidate.totalCost;

    // Keep groups within max number of assignments
    const assignmentsInEachGroup = groups;


    // Count the number of assignments made in each of the groups, if any
    for (let j = 0; j < assignmentsInEachGroup.length; j++) {

        assignmentsInEachGroup[j].assignments = 0;

        for (let i = 0; i < candidate.assignment.length; i++) {
            if (assignmentsInEachGroup[j].cols.includes(candidate.assignment[i].col)) {
                assignmentsInEachGroup[j].assignments++;
            }
        }
    }

    const possibleAssignments = candidate.assignment.length;

    // Surplus Assignments is a metric that measures how many "extra" agents have been assigned to a group of tasks that have constraints on the maximum number assignmnts
    // For example: If a factory manager decides that only 2 workers can be assigned to the kiln room, but the workers can choose between 10 kiln room jobs.
    // A group constraint can be setup by the manager to ensure that once 2 assignments to the kiln room have been made ,then no more will be made.
    // Thats where Surplus Assignments comes in , if a solution is generated by the genetic algorithm that assigns 3 workers to the kiln room,
    // the Surplus Assignments for the soltuion will be 1. This value is then heavily weighted in the distance function to ensure that no solutions are returned
    // that violate the group constraint
    const surplusAssignments = assignmentsInEachGroup.reduce(
        (acc, curr) => {

            return acc + Math.max(curr.assignments - curr.maxNumberOfAssignments, 0)
        }, 0)

    
        /**
         * This is the most important function in the algorithm, this function calculates a distance score for a candidate solution
         * The lower the distance, the closer the candidate is to the perfect solution.
         * 
         * The cost is taken to the power of Surplus Assignments to greatly increase the distance if a solution has surplus assignments
         * @param {*} cost - total cost of a given solution
         * @param {*} possibleAssignments - the total possible assignments that a solution can have, equal to maxAssignments
         * @param {*} surplusAssignments - the number of surplus assignments in a given solution
         */
    function calculateDistance(cost, possibleAssignments, surplusAssignments) {
        // Potential improvements can be made to this formula to ensure the solution converges to 1
        const costTaskRatio = cost / possibleAssignments;
        return Math.pow(costTaskRatio + 1 , surplusAssignments +1);
    }

    // Return a candidate with attached fitness value
    candidate.distance = calculateDistance(cost, possibleAssignments, surplusAssignments);
    return candidate;

}

/**
 * 
 * @param {*} groups - array of group objects [{maxAssignments: number, tasks: Task[]}]
 * @param {*} colNames - names of each task
 */
function getGroups(groups, colNames) {

    const newGroups = groups.map(group => {
        return {
            maxNumberOfAssignments: group.maxAssignments,
            cols: group.tasks.map(task =>
                colNames.findIndex((colName) => colName === task.taskId)
            )
        }
    })

    return newGroups;

}

/**
 * This function creates a number of mutated candidates within the population.
 * If a candidate receives a mutation then their solution wiil be replaced with a new valid solution.
 * @param {*} candidates - a list of valid vandidate solutions
 * @param {*} mutationChance - the probability that any candidate will receieve a mutation between 0 and 1
 */
function mutate(candidates, mutationChance) {

    let mutationsThisGeneration = 0;
    for (let i = 0; i < candidates.length; i++) {
        if (randomRealBetweenInclusive(0,1) < mutationChance) {

            mutationsThisGeneration++;

            candidates[i].assignment = getRandomAssignment();;
            candidates[i].totalCost = calculateTotalCost(candidates[i].assignment);
            candidates[i].distance = distance(candidates[i], groups);

        }
    }
    log(`\tMutated: ${mutationsThisGeneration}`);

    return candidates;
}

/**
 * This function will perform a crossover of the given parent list to create a list of offspring candidates of equal length.
 * @param {*} parents - a list of parent candidates
 */
function crossover(parents) {

    // Pointless to crossover with only 1 parent
    if (parents.length <= 1) {
        return parents;
    }

    // Break down all parent assignment pairs into a flat list
    // i.e. one parents solution might look like this :
    // [ {agent: 1, task: 2}, {agent: 2, task:1}] and another parents solution might look like this
    // [ {agent: 2, task: 1}, {agent: 1, task: 2}]
    // The result of this next statement will return a list that looks like this
    // [{agent: 1, task: 2}, {agent: 2, task:1}, {agent: 2, task: 1}, {agent: 1, task: 2}]
    // In other words it will flatten all valid assignments into a 1D array
    const parentAssignments = [].concat(...parents
        .map(parent => parent.assignment))

    // Assignment length is the length of assignments to make before considering an offspring "complete"
    const assignmentLength = parents[0].assignment.length;

    // offSpringMaxLength is the number of offspring to create
    const offspringMaxLength = parents.length;

    // Initialise an empty array to store the new candidates
    const offspring = [];


    // Iterate while there are still parent assignments left
    // This loop will essentially attempt to build the lowest cost VALID solution from the flattened list of parent assignments
    // The first entry in each offsprings solution will be the lowest cost valid assignment
    // On each inner loop iteration the list of valid assignments is filtered based on the current offspring solution
    while (parentAssignments.length > 0) {

        // newAssignment will hold the new offspring's solution
        let newAssignment = [];

        // This label is required to break out of the inner loop when there are no more valid assignments for a given offspring
        startAgain:

            // Iterate while the solution is not complete
            while (newAssignment.length < assignmentLength) {

                // Filter the list of remaining parent assignments to create a list of valid assignments for the current solution
                // i.e. if the offspring solution already contains an assigmnent to task 1, the list of valid assignments cannot contain any assignments to task 1
                const validAssignments = parentAssignments.filter(assignment => isValidAssignment(assignment, newAssignment));

                // If there are no more valid assignments left then attempt to build a new offspring
                if (validAssignments.length === 0) {
                    break startAgain;
                }

                
                let lowestCostAssignment, lowestCostIndex;

                // find the lowest cost assignment in the list of valid assignments
                [lowestCostAssignment, lowestCostIndex] = findLowestCostAssignment(validAssignments);

                // Add the lowest cost valid assignment to the offspring solution
                newAssignment.push(lowestCostAssignment);

                // Remove this assignment from the parent assignment list otherwise all offspring will be identical.
                parentAssignments.splice(lowestCostIndex, 1);

            }

            // If this new offspring solution is of the correct length then add it to the list of offspring
        if (newAssignment.length === assignmentLength) {
            offspring.push({
                totalCost: calculateTotalCost(newAssignment),
                assignment: newAssignment
            });
        }

    }

    // Determine if the set of offspring is the correct length, i.e. same size as parents 
    if (offspring.length !== offspringMaxLength) {

        log(`\tOffspring padded with ${offspringMaxLength - offspring.length} duplicates.`);

        if (offspring.length === 0) {
            return parents;
        }
        return parents.concat(fillRemainingOffspring(offspring, offspringMaxLength))
    }

    /**
     * Pads out a list of offspring with duplicate offsprings when the size of the offspring list is less than maxLength
     * @param {*} offspring - list of current offspring
     * @param {*} maxLength - the maximum size that should be reached by padding the current offspring
     */
    function fillRemainingOffspring(offspring, maxLength) {

        while (offspring.length < maxLength) {
            // Pick a random offspring and duplicate it to pad out the gene pool

            offspring.push(offspring[randomIntBetweenInclusive(0, offspring.length - 1)])
        }

        return offspring;
    }

    return offspring.concat(parents);

}

/**
 * Returns a random int between min and max inclusive
 * @param {*} min - min inclusive
 * @param {*} max - max inclusive
 */
function randomIntBetweenInclusive(min, max) {
    return generator.intBetween(min,max);
}

/**
 * Returns a random real value between min and max
 * @param {*} min - min inclusive
 * @param {*} max - max inclusive
 */
function randomRealBetweenInclusive(min, max) {
    return generator.floatBetween(min,max);
}

/**
 * Determines if a newAssignment is a valid assignment in the list of currentAssignments
 * @param {*} newAssignment - assignment that you are trying to add to the list of assignments
 * @param {*} currentAssignments - list of already valid assignments
 */
function isValidAssignment(newAssignment, currentAssignments) {
    if (currentAssignments.length === 0) {
        return true;
    }
    const assignedRows = currentAssignments.map(ass => ass.row);
    const assignedCols = currentAssignments.map(ass => ass.col);
    return !(assignedRows.includes(newAssignment.row) || assignedCols.includes(newAssignment.col))
}

/**
 * Finds the lowest cost assignment i.e. agent -> task in a matrix of assignments
 * @param {*} assignment - valid solution matrix
 */
function findLowestCostAssignment(assignment) {
    const lowest = assignment.reduce((acc, curr) => Math.min(curr.cost, acc.cost) === acc.cost ? acc : curr);
    const index = assignment.findIndex(val => val === lowest);
    return [lowest, index]
}

/**
 * Implements fitness proportionate selectection, where a roulette wheel is used to select
 * ideal solutions. In my scenario I am using distance so the function must be implemented
 * inversely.
 * @param {*} pop - population to select parents from
 */
function selectParents(pop) {

    // Calculate total distance of the population
    const totalDistance = pop.reduce((acc, curr) => acc += curr.distance, 0);
    
    // Array of parents to return
    let parents = [];

    // Each candidate should be assigned a weight
    // This weight value determines the likelihood of being selected as a parent
    // Candidates with small distance should have more chance of being selected
    const weights = [];
    for (let i = 0 ; i < pop.length; i++) {
        // Calculate weight for each candidate
        const distance = pop[i].distance;
        
        // Weight value will be small if the distance is large compared to the total
        const weight = totalDistance / (distance * totalDistance);
        weights.push(weight);
    }

    // Select parents, each parent can be selected multiple times
    while (parents.length < Math.ceil(pop.length/2)) { 
        parents.push(pop[selectParentByRoulette(weights)]);
    }


    return parents;
}
/**
 * Selects a parent based on their probability
 * @param {} weights : probability of a parent being selected
 */
function selectParentByRoulette(weights) {
    // A cumulative weight total should be calculated
    const totalWeight = weights.reduce((acc, curr) => acc += curr, 0);

    // Generate random real number between 0 and the total weight
    let section = randomRealBetweenInclusive(0, totalWeight);

    // Iterate through the candidates, (least probable first) and subtract the candidates
    // weight value from the randomly generated value
    // This will determine which "section" of the roulette the random number has landed on
    for (let i = weights.length -1; i > 0; i--) {
        section -= weights[i];

        // If the section is less than 0, the roulette has landed on this parent
        if (section < 0) {
            return i;
        }
    }

    // if something goes wrong just return the best candidate
    return 0;
}   

/**
 * sorts a given population of candidate solutions by their distance values
 * @param {*} population - list of valid solution candidates  
 */
function sortByDistance(population) {
    return population.sort((a, b) => a.distance - b.distance);
}

/**
 * 
 * Initialises a random population of candidate solutions of size n
 * @param {*} n -population size
 */
function generatePopulation(n) {

    const population = [];
    while (population.length < n) {

        log(`population size: ${population.length}`);

        const assignment = getRandomAssignment();

        population.push({
            totalCost: calculateTotalCost(assignment),
            assignment: assignment
        })

    }


    return population;
}

/**
 * Calculates the total cost for a given solution
 * @param {*} assignment 
 */
function calculateTotalCost(assignment) {

    return assignment.map(assign => assign.cost).reduce((acc, curr) => acc + curr, 0);
}

/**
 * An internal function call that creates a  random valid assignment matrix
 */
function getRandomAssignment() {
    function isAssigned(array) {
        const set = new Set(array);
        return set.has(1) && set.size === 1;
    }


    const constrainedColumns = groups && groups.length > 0;
    // Pick a random vector to start at in the shorter dimension
    let colIndex = randomIntBetweenInclusive(0, cols - 1);
    let rowIndex = randomIntBetweenInclusive(0, rows - 1);

    let assignments = [];
    let assigned = false;

    while (!assigned) {


        let assignment = {}
        assignment.row = rowIndex;
        assignment.col = colIndex;

        assignment.cost = costMatrix[assignment.row][assignment.col];
        assignments.push(assignment);
        rowIndex = rowIndex + 1 > (rows - 1) ? 0 : rowIndex + 1;
        colIndex = colIndex + 1 > (cols - 1) ? 0 : colIndex + 1;

        assigned = assignments.length === maxAssignments;
    }

    return assignments;
}

/**
 * Returns the max number of column assignments
 * This value will be less than the number of cols if column constraints are in place
 */
function getMaxNumberOfColumnAssignments() {
    // If no groups are defined, the max number of column assignments is just cols
    if (!groups || groups.length === 0) {
        return cols;
    }
    const numberOfColumnsConstrainedInGroups = groups.reduce((acc, curr) => acc += curr.cols.length, 0);
    const totalAssignmentsAllowedBetweenConstrainedColumns = groups.reduce((acc, curr) => curr.maxNumberOfAssignments, 0);
    return (cols - numberOfColumnsConstrainedInGroups) + totalAssignmentsAllowedBetweenConstrainedColumns;

}

/**
 * 
 * @param {number[][] || Agent[]} data 
 * @param {GeneticOption} geneticOptions 
 * @param {string[]} rownames 
 * @param {string[]} colnames 
 */
function start(data, geneticOptions = {
    maxGenerations: 15,
    mutationChance: 0.3,
    returnedCandidates: 3,
    populationSize: 30,
    distanceThreshold: 3,
    groups: []
}, rownames, colnames, logging = true) {

    const e = require('../error/ExceptionTypes');
    try {
        const v = require('../error/GeneticInputValidator');
        v.validateGeneticInputData(data);
        
    } catch(error) {
        return error;
    }
    // Catch any errors 
    try {

        // Determine if the algorithm should use a seed (run deterministically) for unit tests
        generator = require('random-seed').create(geneticOptions.seed);

        // Turn on logging if no seed is supplied
        logging = !!logging;

        // Determine the lowest possible cost for this input

        // initialise matrix to prevent error
        let matrix = [];

        // initiliase rowNames and colNames to prevent error
        let rowNames, colNames = [];

        // realAgents is true if the data comes from the main-system
        // i.e. agent emails and task names are contained within the data structure
        const realAgents = !!data[0].answers;
    

        if (realAgents) {

            // Create a cost matrix from agent answers (this should probably be implemented before calling this routine)
            matrix = data.map(agent => {
                return agent.answers.map(answer => {
                    return answer.cost
                })
    
            })

            rowNames = data.map(agent => agent.agentId);
            colNames = data[0].answers.map(answer => answer.taskId);

        } else {
            // otherwise the data is a cost matrix already
            matrix = data;
            colNames = colnames;
            rowNames = rownames;
        }

        // Use the hungarian to find the minimum total cost for the distance function
        // This is a possibleimprovement to ensure the algorithm works better with no constraints
        // let hungarian = new h();
        // minimumTotalCost = hungarian.getMinimumTotalCost(matrix);


        // Set up rows and cols length
        rows = matrix.length;
        cols = matrix[0].length;
        costMatrix = matrix;

        // Groups are constraints set on the number of assignable columns
        groups = getGroups(geneticOptions.groups, colNames);


        // If a group is specified the maxColumnAssignments will be smaller than cols
        maxColumnAssignments = getMaxNumberOfColumnAssignments();

        // maxAssignments checks if the number rows is still less than the constrained columns
        maxAssignments = Math.min(rows, maxColumnAssignments);

        //===========================================================================================
        //		BEGIN GENETIC
        //===========================================================================================

        // Track the generation number
        let generation = 0;

        // Generate a random population of valid candidates
        let population = generatePopulation(geneticOptions.populationSize);

        while (generation < geneticOptions.maxGenerations) {

            log(`\n\n\nGeneration ${generation+1} =================================\n`);
            population = sortByDistance(advanceGeneration(population.map(
                    (cand) => distance(cand)),
                geneticOptions.mutationChance / 100,
                groups,
                rows,
                cols
            ));

            log(`\tBest Distance: ${population[0].distance}\n`);
            
            if (population[0].distance < geneticOptions.distanceThreshold) {
                // Optimum stopping distance
                break;
            }
            generation++;
        }

        //===========================================================================================
        //		LOG BEST CANDIDATE  
        //===========================================================================================
        log(`======================================================================\n\tFINISHED\n\n`);

        log(`\tBest Candidate`);
        log(`\tTotal Cost: ${population[0].totalCost}`);
        log(`\tDistance: ${population[0].distance}`);
        log(population[0].assignment);



        //===========================================================================================
        //		RETURN NAMED ASSIGNMENTS OR A SOLVED COST MATRIX TO CALLING FUNCTION
        //===========================================================================================
        if (realAgents) {
            return getTopResultsWithRealAgents(data, population, geneticOptions.returnedCandidates);
        } else {
            return getTopResultsWithDummyNames(matrix, population, geneticOptions.returnedCandidates, rowNames, colNames);
        }



    } catch (err) {
        console.error(err);
        
        return e.geneticError;
    }

}

function log(message) {
    if(!logging) return;
   
}
//===========================================================================================
//		ADVANCE GENERATION    
//===========================================================================================
/**
 * 
 * @param {*} population - a llist of candidate solutions
 * @param {*} mutationChance - a real number indicating the chance a candidate will receieve a mutation
 * @param {*} groups - a list of constrained columns
 * @param {*} rows - number of rows
 * @param {*} cols 
 */
function advanceGeneration(population, mutationChance, groups) {

    const sortedCandidates = sortByDistance(population);
    const mutatedCandidates = sortByDistance(mutate(sortedCandidates, mutationChance).map(
        (cand) => distance(cand)));

    const parents = selectParents(mutatedCandidates);

    let nextGeneration = crossover(parents);
    if (nextGeneration.length < population.length) {
        // No offspring where created
        log(`No offspring created`);
        nextGeneration = mutatedCandidates;
    }
    return nextGeneration.map(c => distance(c));


}


//===========================================================================================
//		RETURN FUNCTIONS
//===========================================================================================
/**
 * This function returns a solved matrix as well as assignment pairs
 * @param {*} mat - the initial costMatrix
 * @param {*} finalResult - the final population
 * @param {*} n - number of candidates to return from (top)
 * @param {*} rownames - names of the rows
 * @param {*} colnames  - names of the columns
 */
function getTopResultsWithDummyNames(mat, finalResult, n, rownames, colnames) {
    // Only want unique results
    finalResult = new Set((finalResult.sort((a, b) => a.distance - b.distance)));
    
    // Return top n candidates
    finalResult = Array.from(finalResult).slice(0, n);
        
    // Creates a 3D array where each entry is a resulting 2D matrix solution
    const solutionMatrix = 
    Array.from({length: finalResult.length}, 
        () => Array.from({length: mat.length}, 
            () => Array.from({length: mat[0].length}, 
                () => 0))
    ).map(
        (solution, i) => getSolution(solution, finalResult[i].assignment)
    );



    /**
     * map function to populate each 2D matrix contained in the 3D solution matrix
     * @param {*} emptyMatrix - an empty matrix to fill with a solution
     * @param {*} assignment - an assignment
     */
    function getSolution(emptyMatrix, assignment){
        for (let i = 0; i < assignment.length; i++) {
            emptyMatrix[assignment[i].row][assignment[i].col] = 1;
        }

        return emptyMatrix;
    }
    return finalResult.map((result, index) => {
        const assignment = getAssignmentPairs(solutionMatrix[index], mat ,rownames, colnames);
            return {
                solution: solutionMatrix[index],
                assignment: assignment,
                assignmentRating: getAssignmentRating(assignment),
                totalCost: result.totalCost,
                distance: result.distance
            }
        })
    
    
}

/**
 *  this function returns assignment pairs: {agent, task, cost}
 * @param {*} maskMatrix - the assigned columns/rows
 * @param {*} costMatrix - the original cost data
 * @param {*} rownames 
 * @param {*} colnames 
 */
function getAssignmentPairs(maskMatrix, costMatrix, rownames, colnames) {

    if (maskMatrix && colnames && rownames) {
        const pairs = [];
        for (let i = 0; i < rownames.length; i++) {
            for (let j = 0; j < colnames.length; j++) {

                if (maskMatrix[i][j] === 1) {

                    pairs.push({
                        agent: {
                            agentId: rownames[i],
                            email: rownames[i]
                        },
                        task: {
                            taskId: colnames[j],
                            taskName: colnames[j]
                        },
                        cost: costMatrix[i][j]
                    });
                }
            }
        }

        return pairs;
    }
}

/**
 * This function is called to return a list of assignments with real agent names
 * @param {} data - the list of agents with survey answers passed from the main-system
 * @param {*} finalResult 
 * @param {*} returnCandidates 
 */
function getTopResultsWithRealAgents(data, finalResult, returnCandidates) {
    finalResult = (finalResult.sort((a, b) => a.distance - b.distance))
        .slice(0, returnCandidates);

    const tasks = data[0].answers.map(answer => answer);

    return finalResult.map(result => {
        return {
            totalCost: result.totalCost,
            distance: result.distance,
            assignment: result.assignment.map(matrix => {
                return {
                    agent: data[matrix.row],
                    task: {
                        taskId: tasks[matrix.col].taskId,
                        taskName: tasks[matrix.col].taskName
                    },
                    cost: matrix.cost
                }
            })
            
        }
    })
}

function getAssignmentRating(results) {
    return results.map(res => res.cost).filter(cost => cost < 3).length / results.length;

}



exports = module.exports = start;