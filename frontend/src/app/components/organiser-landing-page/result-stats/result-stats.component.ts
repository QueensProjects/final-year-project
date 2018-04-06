import { Component, Input, OnInit } from '@angular/core';
import { AssignmentResults } from '../../../services/http/interfaces/AssignmentResults';
import { HttpAssignmentService } from '../../../services/http/http-assignment-service';
import { Assignment } from '../../../services/http/interfaces/Assignment';
import { ResultStats } from './ResultStats';

@Component({
  selector: 'app-result-stats',
  templateUrl: './result-stats.component.html',
  styleUrls: ['./result-stats.component.css']
})
export class ResultStatsComponent implements OnInit {

  @Input()
  public assignmentId: string;

  @Input()
  public assignment: Assignment;


  private results: AssignmentResults[];

  public resultStats: ResultStats = <ResultStats>{};
  private pieGridResults: any;

  constructor(public http: HttpAssignmentService) {

  }

  ngOnInit() {
    if (this.assignmentId) {
      this.http.getAssignmentResults(this.assignmentId)
        .subscribe(
          (res: AssignmentResults[]) => {
            console.log(res);
            this.results = res;
            this.getResultStats();
          },
          (err) => console.error(err)

        );
    }
  }

  private getResultStats() {

    this.resultStats.agentsAssigned = this.results.length;
    this.resultStats.tasksAssigned = this.results.length;
    this.resultStats.totalAgents = this.assignment.agents.length;
    this.resultStats.totalTasks = this.assignment.tasks.length;

    this.resultStats.assignmentRating = this.getAssignmentRating();
    this.resultStats.meanCost = this.getMeanCost();
    this.pieGridResults = this.getPieGridResults();
  }

  public getMeanCost() {
    return this.results.map(res => res.cost).reduce((acc, curr) => {
      return acc + curr;
    }) / this.results.length;
  }

  public getAssignmentRating() {
    return this.results.map(res => res.cost).reduce((acc, curr) => {
      return acc + 1 / curr;
    }, 0) / this.results.length;
  }

  public getPieGridResults() {
    const costs = this.results.map(res => res.cost);

    return this.assignment.surveyOptions.maxSelection > 10 ? [
      {
        name: 'Assigned to top 3',
        value: this.tallyAssignments((assignment: AssignmentResults) => assignment.cost < 3)
      },
      {
        name: 'Assigned to top 5',
        value: this.tallyAssignments((assignment: AssignmentResults) => assignment.cost < 5)
      },
      {
        name: 'Assigned to top 8',
        value: this.tallyAssignments((assignment: AssignmentResults) => assignment.cost < 8)
      },
      {
        name: 'Assigned to 10+',
        value: this.tallyAssignments((assignment: AssignmentResults) => assignment.cost > 10)
      }
    ] :
      [
        {
          name: '1st Choice',
          value: this.tallyAssignments((assignment: AssignmentResults) => assignment.cost === 1)
        },
        {
          name: 'Not 1st Choice',
          value: this.tallyAssignments((assignment: AssignmentResults) => assignment.cost > 1)
        }

      ];

  }

  public tallyAssignments(compareFn) {
    return this.results.filter(compareFn).length;
  }
}
