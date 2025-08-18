import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ChatDiscussionComponent } from './chat-discussion.component';

const routes: Routes = [

  {
    path: '',
    component: ChatDiscussionComponent
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ChatDiscussionRoutingModule { }
