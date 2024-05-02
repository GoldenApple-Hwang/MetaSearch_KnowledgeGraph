import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';  // URL 파라미터를 가져오기 위해 사용
import PeopleBubbleChart from '../components/PeopleBubbleChart';

const PeopleBubbleChartPage = () => {
    const [data, setData] = useState([]);
    const { dbName } = useParams();  // URL에서 dbName 파라미터 추출

    useEffect(() => {
        const apiUrl = `http://113.198.85.4/peoplebubblechart/${dbName}`; // 실제 배포 시 도메인 주소로 변경 필요

        const fetchData = async () => {
            try {
                const response = await fetch(apiUrl);
                if (response.ok) {
                    const fetchedData = await response.json();
                    setData(fetchedData);
                } else {
                    throw new Error('Network response was not ok.');
                }
            } catch (error) {
                console.error('Error fetching data:', error);
            }
        };

        fetchData();
    }, [dbName]); // dbName이 변경될 때마다 fetchData 함수를 다시 호출

    return (
        <div>
            <h1>People Bubble Chart for {dbName}</h1>
            <PeopleBubbleChart data={data} />
        </div>
    );
};

export default PeopleBubbleChartPage;
