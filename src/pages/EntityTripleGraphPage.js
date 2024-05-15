import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';  // URL 파라미터를 가져오기 위해 사용
import EntityTripleGraph from '../components/EntityTripleGraph.js';

const EntityTripleGraphPage = () => {
    const [data, setData] = useState([]);
    const { dbName, entity } = useParams();  // URL에서 dbName 파라미터 추출

    useEffect(() => {
        const apiUrl = 'http://113.198.85.6/graph/entitytripledata';
        const fetchData = async () => {
            try {
                const response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        dbName: dbName,
                        entityName: entity
                    })
                });
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
    }, [dbName, entity]); // dbName과 entity가 변경될 때마다 fetchData 함수를 다시 호출

    return (
        <div>
            <EntityTripleGraph data={data} dbName={dbName}/>
        </div>
    );
};

export default EntityTripleGraphPage;
