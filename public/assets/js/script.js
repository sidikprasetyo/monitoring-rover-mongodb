// Dark mode toggle
const darkModeToggle = document.getElementById('darkmode-toggle');
const modeIcon = document.getElementById('mode-icon');

// Default to light mode
let darkMode = false;

// Add event listener to the icon for toggling dark mode
modeIcon.addEventListener('click', function() {
    darkMode = !darkMode;

    if (darkMode) {
        document.body.classList.add('dark-mode');
        modeIcon.classList.remove('bi-moon-stars');
        modeIcon.classList.add('bi-sun-fill');
    } else {
        document.body.classList.remove('dark-mode');
        modeIcon.classList.remove('bi-sun-fill');
        modeIcon.classList.add('bi-moon-stars');
    }

    updateChartColors(darkMode);
});

// Initialize chart
const ctx = document.getElementById('sensorChart').getContext('2d');
let sensorChart = new Chart(ctx, {
    type: 'line',
    data: {
        labels: [],
        datasets: [
            {
                label: 'Suhu (°C)',
                data: [],
                borderColor: 'rgba(255, 99, 132, 1)',
                borderWidth: 2,
                fill: false
            },
            {
                label: 'Kelembapan (%)',
                data: [],
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 2,
                fill: false
            },
            {
                label: 'CO2 (ppm)',
                data: [],
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 2,
                fill: false
            },
            {
                label: 'NH3 (ppm)',
                data: [],
                borderColor: 'rgba(153, 102, 255, 1)',
                borderWidth: 2,
                fill: false
            }
        ]
    },
    options: {
        responsive: true,
        animation: false, // Disable animation for better performance
        scales: {
            x: {
                ticks: { color: '#444' },
                grid: { color: '#ddd' }
            },
            y: {
                beginAtZero: true,
                ticks: { color: '#444' },
                grid: { color: '#ddd' }
            }
        }
    }
});

let sampleData = [];

// Connect to WebSocket
const socket = io('wss://monitoring-rover-mongodb-production.up.railway.app');

// Initialize data on connection
socket.on('connect', async () => {
    try {
        // Fetch initial data
        const response = await fetch('https://monitoring-rover-mongodb-production.up.railway.app/api/sensor-data');
        const initialData = await response.json();
        
        // Sort and get latest 5 entries
        sampleData = initialData
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, 5); // No need to reverse since we want descending order
        
        updateDisplays(sampleData);
    } catch (error) {
        console.error('Error fetching initial data:', error);
    }
});

// Listen for real-time updates
socket.on('sensor-data', (newData) => {
    // Format the new data
    const formattedData = {
        ...newData,
        timestamp: new Date(),
    };

    // Add new data at the beginning of the array
    sampleData.unshift(formattedData);
    
    // Keep only the latest 5 entries
    if (sampleData.length > 5) {
        sampleData.pop();
    }

    // Update displays with the new data
    updateDisplays(sampleData);
    
    // Update current values display
    updateCurrentValues(formattedData);
});

// Update all displays (chart and table)
function updateDisplays(data) {
    updateChart(data);
    updateTable(data);
}

// Update chart with new data
function updateChart(data) {
    // Create a reversed copy of the data for the chart to maintain chronological order
    const chartData = [...data].reverse();
    
    // Prepare data for chart
    const labels = chartData.map(item => new Date(item.timestamp).toLocaleTimeString());
    const suhuData = chartData.map(item => item.suhu);
    const kelembapanData = chartData.map(item => item.kelembapan);
    const co2Data = chartData.map(item => item.co2);
    const nh3Data = chartData.map(item => item.nh3);

    // Update chart data
    sensorChart.data.labels = labels;
    sensorChart.data.datasets[0].data = suhuData;
    sensorChart.data.datasets[1].data = kelembapanData;
    sensorChart.data.datasets[2].data = co2Data;
    sensorChart.data.datasets[3].data = nh3Data;

    sensorChart.update('none'); // Update without animation
}

// Update table with new data
function updateTable(data) {
    const dataTable = document.getElementById('dataTable');
    dataTable.innerHTML = '';

    data.forEach((item, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${new Date(item.timestamp).toLocaleTimeString()}</td>
            <td>${item.suhu}</td>
            <td>${item.kelembapan}</td>
            <td>${item.co2}</td>
            <td>${item.nh3}</td>
        `;
        dataTable.appendChild(row);
    });
}

// Update current values display
function updateCurrentValues(data) {
    const co2StatusElement = document.getElementById('co2-status');
    const nh3StatusElement = document.getElementById('nh3-status');

    document.getElementById('suhu').textContent = `${data.suhu}°C`;
    document.getElementById('kelembapan').textContent = `${data.kelembapan}%`;
    document.getElementById('co2').textContent = `${data.co2} ppm`;
    document.getElementById('nh3').textContent = `${data.nh3} ppm`;

    const co2Status = getCO2Status(data.co2);
    const nh3Status = getNH3Status(data.nh3);

    co2StatusElement.textContent = `Kualitas Udara: ${co2Status}`;
    nh3StatusElement.textContent = `Kualitas Udara: ${nh3Status}`;

    // Remove all status classes before adding the new one
    co2StatusElement.classList.remove('status-sehat', 'status-kurang-sehat', 'status-buruk', 'status-bahaya');
    nh3StatusElement.classList.remove('status-sehat', 'status-kurang-sehat', 'status-buruk', 'status-bahaya');

    // Set color based on CO2 status
    switch (co2Status) {
        case 'Sehat':
            co2StatusElement.style.color = 'green';
            break;
        case 'Kurang Sehat':
            co2StatusElement.style.color = 'orange';
            break;
        case 'Buruk':
            co2StatusElement.style.color = 'red';
            break;
        case 'Bahaya':
            co2StatusElement.style.color = 'darkred';
            break;
    }

    // Set color based on NH3 status
    switch (nh3Status) {
        case 'Sehat':
            nh3StatusElement.style.color = 'green';
            break;
        case 'Kurang Sehat':
            nh3StatusElement.style.color = 'orange';
            break;
        case 'Buruk':
            nh3StatusElement.style.color = 'red';
            break;
        case 'Bahaya':
            nh3StatusElement.style.color = 'darkred';
            break;
    }
}

// Helper functions for status
function getCO2Status(co2) {
    if (co2 < 400) return 'Sehat';
    if (co2 < 800) return 'Kurang Sehat';
    if (co2 < 1200) return 'Buruk';
    return 'Bahaya';
}

function getNH3Status(nh3) {
    if (nh3 < 5) return 'Sehat';
    if (nh3 < 15) return 'Kurang Sehat';
    if (nh3 < 25) return 'Buruk';
    return 'Bahaya';
}

// Update chart colors based on dark mode
function updateChartColors(isDarkMode) {
    const textColor = isDarkMode ? '#f1f1f1' : '#444';
    const gridColor = isDarkMode ? '#666' : '#ddd';

    sensorChart.options.scales.x.ticks.color = textColor;
    sensorChart.options.scales.x.grid.color = gridColor;
    sensorChart.options.scales.y.ticks.color = textColor;
    sensorChart.options.scales.y.grid.color = gridColor;

    sensorChart.update('none');
}

// Fungsi untuk mengunduh CSV
function downloadCSV(csvData, filename) {
    return new Promise((resolve, reject) => {
        try {
            let csvFile = new Blob([csvData], { type: "text/csv" });
            let downloadLink = document.createElement("a");
            downloadLink.download = filename;
            downloadLink.href = window.URL.createObjectURL(csvFile);
            downloadLink.style.display = "none";
            
            // Event listener untuk mendeteksi ketika download selesai atau dibatalkan
            const timeoutDuration = 1000; // 1 detik timeout
            let timeout;
            
            const cleanup = () => {
                clearTimeout(timeout);
                window.URL.revokeObjectURL(downloadLink.href);
                document.body.removeChild(downloadLink);
            };
            
            downloadLink.onclick = () => {
                timeout = setTimeout(() => {
                    cleanup();
                    resolve(true);
                }, timeoutDuration);
            };
            
            downloadLink.onerror = () => {
                cleanup();
                reject(new Error('Download gagal'));
            };
            
            document.body.appendChild(downloadLink);
            downloadLink.click();
            
            // Jika tidak ada interaksi dalam 100ms, anggap download dibatalkan
            setTimeout(() => {
                cleanup();
                resolve(false);
            }, 100);
            
        } catch (error) {
            reject(error);
        }
    });
}

// Fungsi untuk mendapatkan semua data dari database dan mengkonversi ke CSV
async function exportAllDataToCSV() {
    const downloadBtn = document.getElementById("download-csv");
    const originalText = "Print Data"; // Teks asli tombol
    
    try {
        // Tampilkan loading spinner atau pesan
        downloadBtn.innerHTML = "Mengunduh...";
        downloadBtn.disabled = true;

        // Fetch semua data dari endpoint baru
        const response = await fetch('https://monitoring-rover-mongodb-production.up.railway.app/api/sensor-data');
        const allData = await response.json();

        if (!allData || allData.length === 0) {
            alert('Tidak ada data untuk diunduh');
            return;
        }

        // Urutkan data berdasarkan timestamp (terbaru ke terlama)
        allData.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        // Buat header CSV
        const headers = ['No', 'Tanggal', 'Waktu', 'Suhu (°C)', 'Kelembapan (%)', 'CO2 (ppm)', 'NH3 (ppm)'];
        let csvContent = headers.join(',') + '\n';

        // Konversi data ke format CSV
        allData.forEach((item, index) => {
            const date = new Date(item.timestamp);
            const row = [
                index + 1,
                date.toLocaleDateString(), // Tanggal
                date.toLocaleTimeString(), // Waktu
                item.suhu,
                item.kelembapan,
                item.co2,
                item.nh3,
            ];
            csvContent += row.join(',') + '\n';
        });

        // Generate nama file dengan timestamp
        const date = new Date();
        const filename = `sensor_data_${date.getFullYear()}${(date.getMonth()+1).toString().padStart(2,'0')}${date.getDate().toString().padStart(2,'0')}.csv`;

        // Download file dan tunggu hasilnya
        const downloadSuccessful = await downloadCSV(csvContent, filename);
        
        if (!downloadSuccessful) {
            console.log('Download dibatalkan oleh pengguna');
        }

    } catch (error) {
        console.error('Error downloading data:', error);
        alert('Terjadi kesalahan saat mengunduh data');
    } finally {
        // Kembalikan tombol ke keadaan semula
        downloadBtn.innerHTML = originalText;
        downloadBtn.disabled = false;
    }
}

// Event listeners untuk tombol download
document.addEventListener('DOMContentLoaded', function() {
    const downloadAllBtn = document.getElementById("download-csv");
    if (downloadAllBtn) {
        downloadAllBtn.addEventListener("click", exportAllDataToCSV);
    }
});
