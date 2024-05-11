import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import PeopleBubbleChartPage from './pages/PeopleBubbleChartPage.js'
import EntityTripleGraphPage from './pages/EntityTripleGraphPage.js'
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Test from './Test.js'

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <BrowserRouter>
    <Routes>
      <Route path='/' element={<Test/>}/>
      <Route path='/graph/:dbName' element={<App/>}></Route>
      {/* 상단에 위치하는 라우트들의 규칙을 모두 확인, 일치하는 라우트가 없는경우 처리 */}
			{/*<Route path="*" element={<NotFound />}></Route>*/}
      <Route path='/personbubble/:dbName' element={<PeopleBubbleChartPage/>}/>
      <Route path='/entityTripleGraph/:dbName/:entity' element={<EntityTripleGraphPage/>}/>
    </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
