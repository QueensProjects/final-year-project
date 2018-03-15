/***********************************************************************
 * Date: 28/01/2018
 * Author: Daniel Cooke
 ***********************************************************************/
/*
 DCOOKE 28/01/2018 - The app.module is used to bootstrap the application, it is essential to build dependency trees
 */
import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpModule } from '@angular/http';

import { AppComponent } from './app.component';
import { NewProblemComponent } from './new-problem/new-problem.component';

import { RouterModule, Routes } from '@angular/router';
import { HomePageComponent } from './home-page/home-page.component';
import { PlaygroundComponent } from './playground/playground.component';
import { PlaygroundModule } from './playground/playground.module';
import { UploadIconComponent } from './new-problem/upload-icon.component';
import { NgUploaderModule } from 'ngx-uploader';

import { AlertServiceComponent } from '../services/alert-service/alert-service.component';
import { AlertService } from '../services/alert-service/alert-service';
import { HttpBaseService } from '../services/http/http-base-service';
import { HttpCSVService } from '../services/http/http-csv-service';
import { HttpCostMatrixService } from '../services/http/http-cost-matrix';
import { ErrorHandlingService } from '../services/error-handling-service/error-handling-service';
import { AssignmentDetailsComponent } from './new-problem/assignment-details/assignment-details.component';
import { EnterTaskAgentsComponent } from './new-problem/task-agents/enter-task-agents/enter-task-agents.component';
import { UploadTaskAgentsComponent } from './new-problem/task-agents/upload-task-agents/upload-task-agents.component';
import { TaskAgentsComponent } from './new-problem/task-agents/task-agents.component';
import { ScrollDisplayComponent } from './new-problem/task-agents/upload-task-agents/scroll-display/scroll-display.component';


/*
 DCOOKE 28/01/2018 - I will be storing the application routes here as there will not be enough routes to warrant a
 separate file
 */
const appRoutes: Routes = [
  { path: '',                           component: NewProblemComponent},
  { path: 'playground',                           component: PlaygroundComponent},
  { path: 'new-problem',                           component: NewProblemComponent}


];


@NgModule({
  declarations: [
    AppComponent,
    NewProblemComponent,
    HomePageComponent,
    UploadIconComponent,
    UploadTaskAgentsComponent,
    EnterTaskAgentsComponent,
    TaskAgentsComponent,
    ScrollDisplayComponent,
    AlertServiceComponent,
    AssignmentDetailsComponent
  ],
  imports: [
    BrowserModule,
    FormsModule,
    HttpModule,
    ReactiveFormsModule,
    NgUploaderModule,
    RouterModule.forRoot(
      appRoutes,
      { enableTracing: true}
    ),
    PlaygroundModule
  ],
  providers: [
    AlertService,
    HttpBaseService,
    HttpCSVService,
    HttpCostMatrixService,
    ErrorHandlingService
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }

